"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  getAllPreferences,
  getAllAssignments,
  clearAllAssignments,
  saveAssignment,
  saveAllocationStatus,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  getAllRoles,
  saveRole,
  deleteRole,
} from "@/lib/database";
import { allocateRoles } from "@/lib/algorithm";
import type { Preference, Assignment } from "@/lib/types";
import { roles } from "@/lib/roles";
import Layout from "@/components/layout";
import AuthGuard from "@/components/auth-guard";

export default function Admin() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleConflicts, setRoleConflicts] = useState<{
    [roleId: string]: boolean;
  }>({});
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [envAdminEmails, setEnvAdminEmails] = useState<string[]>([]);
  
  // Role management state
  const [managedRoles, setManagedRoles] = useState<typeof roles>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({
    id: "",
    title: "",
    description: "",
    capacity: 1
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const preferencesData = await getAllPreferences();
        setPreferences(preferencesData);

        const assignmentsData = await getAllAssignments();
        setAssignments(assignmentsData);

        // Check for role conflicts
        checkRoleConflicts(assignmentsData);

        // Load admin emails
        const dbAdminEmails = await getAdminEmails();
        setAdminEmails(dbAdminEmails);

        // Get environment admin emails
        const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.split(",") || [];
        setEnvAdminEmails(envEmails.map(email => email.trim()));
        
        // Load roles from database
        const rolesData = await getAllRoles();
        setManagedRoles(rolesData);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  
  // Role management handlers
  const handleAddRole = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate role data
    if (!newRole.id || !newRole.title || !newRole.description || newRole.capacity < 1) {
      setError("すべてのフィールドを入力してください。定員は1以上の数値である必要があります。");
      return;
    }
    
    // Check if ID already exists
    if (managedRoles.some(role => role.id === newRole.id)) {
      setError("同じIDの役職が既に存在します。");
      return;
    }
    
    try {
      // Save to database
      await saveRole(newRole);
      
      // Update local state
      setManagedRoles([...managedRoles, newRole]);
      
      // Reset form
      setNewRole({
        id: "",
        title: "",
        description: "",
        capacity: 1
      });
      
      setSuccess("役職を追加しました");
    } catch (error) {
      console.error("Error adding role:", error);
      setError("役職の追加に失敗しました");
    }
  };
  
  const handleUpdateRole = async (roleId: string, updatedData: Partial<typeof newRole>) => {
    try {
      const roleIndex = managedRoles.findIndex(r => r.id === roleId);
      if (roleIndex === -1) return;
      
      const updatedRole = {
        ...managedRoles[roleIndex],
        ...updatedData
      };
      
      // Save to database
      await saveRole(updatedRole);
      
      // Update local state
      const updatedRoles = [...managedRoles];
      updatedRoles[roleIndex] = updatedRole;
      setManagedRoles(updatedRoles);
      
      setEditingRoleId(null);
      setSuccess("役職を更新しました");
    } catch (error) {
      console.error("Error updating role:", error);
      setError("役職の更新に失敗しました");
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    // Check if role is currently assigned to any user
    const isAssigned = assignments.some(a => a.roleId === roleId);
    if (isAssigned) {
      setError("この役職は現在割り当てられているため削除できません。");
      return;
    }
    
    try {
      // Delete from database
      await deleteRole(roleId);
      
      // Update local state
      setManagedRoles(managedRoles.filter(r => r.id !== roleId));
      
      setSuccess("役職を削除しました");
    } catch (error) {
      console.error("Error deleting role:", error);
      setError("役職の削除に失敗しました");
    }
  };

  const handleAddAdminEmail = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    try {
      await addAdminEmail(newAdminEmail);
      setAdminEmails([...adminEmails, newAdminEmail]);
      setNewAdminEmail("");
      setSuccess("管理者メールアドレスを追加しました");
    } catch (error) {
      console.error("Error adding admin email:", error);
      setError("管理者メールアドレスの追加に失敗しました");
    }
  };

  const handleRemoveAdminEmail = async (email: string) => {
    try {
      await removeAdminEmail(email);
      setAdminEmails(adminEmails.filter(e => e !== email));
      setSuccess("管理者メールアドレスを削除しました");
    } catch (error) {
      console.error("Error removing admin email:", error);
      setError("管理者メールアドレスの削除に失敗しました");
    }
  };

  const checkRoleConflicts = (currentAssignments: Assignment[]) => {
    const conflicts: { [roleId: string]: boolean } = {};
    const roleCounts: { [roleId: string]: number } = {};

    // Count assignments per role
    currentAssignments.forEach((assignment) => {
      roleCounts[assignment.roleId] = (roleCounts[assignment.roleId] || 0) + 1;
    });

    // Check for conflicts (more assignments than capacity)
    Object.entries(roleCounts).forEach(([roleId, count]) => {
      const role = roles.find((r) => r.id === roleId);
      if (role && count > role.capacity) {
        conflicts[roleId] = true;
      }
    });

    setRoleConflicts(conflicts);
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      const user = assignments.find((a) => a.userId === userId);
      const role = roles.find((r) => r.id === newRoleId);

      if (!user || !role) return;

      // Find preference rank for the new role
      const userPreference = preferences.find((p) => p.userId === userId);
      const preferenceRank = userPreference
        ? userPreference.preferences.indexOf(newRoleId) + 1
        : 0;

      const newAssignment: Assignment = {
        userId: user.userId,
        userName: user.userName,
        roleId: role.id,
        roleName: role.title,
        preferenceRank,
        timestamp: new Date(),
      };

      // Update database
      await saveAssignment(newAssignment);

      // Update local state
      const newAssignments = assignments.map((a) =>
        a.userId === userId ? newAssignment : a
      );
      setAssignments(newAssignments);

      // Check for conflicts
      checkRoleConflicts(newAssignments);

      setSuccess("役職を更新しました");
    } catch (error) {
      console.error("Error updating role:", error);
      setError("Failed to update role");
    }
  };

  const handleRunAllocation = async () => {
    if (preferences.length === 0) {
      setError("希望が登録されていません。配分を実行できません。");
      return;
    }

    setAllocating(true);
    setError("");
    setSuccess("");

    try {
      // Clear existing assignments
      await clearAllAssignments();

      // Run allocation algorithm
      const result = await allocateRoles(preferences, managedRoles);

      // Check for incomplete allocation
      if (
        result.unassignedUsers.length > 0 ||
        result.unassignedRoles.length > 0
      ) {
        const unassignedUserNames = result.unassignedUsers
          .map(
            (userId) =>
              preferences.find((p) => p.userId === userId)?.userName || userId
          )
          .join(", ");
        const unassignedRoleNames = result.unassignedRoles
          .map((roleId) => roles.find((r) => r.id === roleId)?.title || roleId)
          .join(", ");

        setError(
          `配分が不完全です:\n` +
          `未配分の学生 (${result.unassignedUsers.length}人): ${unassignedUserNames}\n` +
          `未配分の役職 (${result.unassignedRoles.length}個): ${unassignedRoleNames}`
        );
      }

      // Save new assignments
      const savePromises = result.assignments.map((assignment) =>
        saveAssignment(assignment)
      );
      await Promise.all(savePromises);

      // Update allocation status
      // Don't publish results until the admin confirms
      await saveAllocationStatus({ completed: false });

      // Update local state
      setAssignments(result.assignments);

      // Show success message with allocation details
      const successMsg = [
        `配分が完了しました！`,
        `配分された学生数: ${result.assignments.length}人`,
        `未配分の学生数: ${result.unassignedUsers.length}人`,
        `未配分の役職数: ${result.unassignedRoles.length}個`,
        `満足度スコア: ${result.satisfactionScore.toFixed(2)}`,
        ``,
        `※コンソールに詳細なデバッグ情報を出力しています。`,
      ].join("\n");

      setSuccess(successMsg);
    } catch (error) {
      console.error("Error running allocation:", error);
      setError("Failed to run allocation");
    } finally {
      setAllocating(false);
    }
  };

  const handlePublishResults = async () => {
    if (assignments.length === 0) {
      setError("配分結果がありません。結果を公開できません。");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await saveAllocationStatus({ completed: true });
      setSuccess("結果を公開しました！");
    } catch (error) {
      console.error("Error publishing results:", error);
      setError("結果の公開に失敗しました");
    }
  };

  const handleUnpublishResults = async () => {
    setError("");
    setSuccess("");

    try {
      await saveAllocationStatus({ completed: false });
      setSuccess("結果の公開を取り消しました");
    } catch (error) {
      console.error("Error unpublishing results:", error);
      setError("結果の公開取り消しに失敗しました");
    }
  };

  const handleDeleteResults = async () => {
    const userConfirmed = confirm("結果を削除してもよろしいですか？");
    if (!userConfirmed) return;

    try {
      await clearAllAssignments();
      setAssignments([]);
    } catch (error) {
      console.error("配分結果の削除中にエラーが発生しました:", error);
    }
  }

  if (loading) {
    return (
      <AuthGuard requireAdmin>
        <Layout>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAdmin>
      <Layout>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-bold text-gray-900">
              管理者ダッシュボード
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              学生の希望と役職の配分を管理
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-4">
              <button
                onClick={handleRunAllocation}
                disabled={allocating || preferences.length === 0}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                {allocating ? "配分実行中..." : "配分アルゴリズムを実行"}
              </button>

              <button
                onClick={handlePublishResults}
                disabled={assignments.length === 0}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                結果を公開
              </button>

              <button
                onClick={handleUnpublishResults}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                結果の公開を取り消す
              </button>

              <button
                onClick={handleDeleteResults}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                結果を削除する
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                役職の配分結果 ({assignments.length})
              </h2>

              {assignments.length === 0 ? (
                <p className="text-gray-500 italic">
                  まだ配分結果がありません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          学生
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          配分された役職
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          希望順位
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <tr key={assignment.userId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {assignment.userName}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm ${roleConflicts[assignment.roleId]
                                ? "bg-red-50"
                                : ""
                              }`}
                          >
                            <select
                              value={assignment.roleId}
                              onChange={(e) =>
                                handleRoleChange(
                                  assignment.userId,
                                  e.target.value
                                )
                              }
                              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                            >
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.title}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.preferenceRank > 0
                              ? `第${assignment.preferenceRank}希望`
                              : "希望外"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                学生の希望 ({preferences.length})
              </h2>

              {preferences.length === 0 ? (
                <p className="text-gray-500 italic">
                  まだ希望が提出されていません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          学生
                        </th>
                        {[...Array(roles.length)].map((_, i) => (
                          <th
                            key={i}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            第{i + 1}希望
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preferences.map((preference) => (
                        <tr key={preference.userId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {preference.userName}
                          </td>
                          {[...Array(roles.length)].map((_, i) => {
                            const roleId = preference.preferences[i];
                            const role = roleId
                              ? roles.find((r) => r.id === roleId)
                              : null;

                            return (
                              <td
                                key={i}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                {role ? role.title : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                役職の管理
              </h2>

              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  役職一覧
                </h3>

                {managedRoles.length === 0 ? (
                  <p className="text-gray-500 italic">
                    役職が登録されていません。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            役職名
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            説明
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            定員
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {managedRoles.map((role) => (
                          <tr key={role.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingRoleId === role.id ? (
                                <input
                                  type="text"
                                  defaultValue={role.title}
                                  onChange={(e) => {
                                    const updatedRole = { ...role, title: e.target.value };
                                    const index = managedRoles.findIndex(r => r.id === role.id);
                                    if (index !== -1) {
                                      const newRoles = [...managedRoles];
                                      newRoles[index] = updatedRole;
                                      setManagedRoles(newRoles);
                                    }
                                  }}
                                  className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:text-blue-600"
                                  onClick={() => setEditingRoleId(role.id)}
                                >
                                  {role.title}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {editingRoleId === role.id ? (
                                <textarea
                                  defaultValue={role.description}
                                  onChange={(e) => {
                                    const updatedRole = { ...role, description: e.target.value };
                                    const index = managedRoles.findIndex(r => r.id === role.id);
                                    if (index !== -1) {
                                      const newRoles = [...managedRoles];
                                      newRoles[index] = updatedRole;
                                      setManagedRoles(newRoles);
                                    }
                                  }}
                                  className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                                  rows={3}
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:text-blue-600 max-w-md truncate"
                                  onClick={() => setEditingRoleId(role.id)}
                                  title={role.description}
                                >
                                  {role.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingRoleId === role.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  defaultValue={role.capacity}
                                  onChange={(e) => {
                                    const capacity = parseInt(e.target.value) || 1;
                                    const updatedRole = { ...role, capacity };
                                    const index = managedRoles.findIndex(r => r.id === role.id);
                                    if (index !== -1) {
                                      const newRoles = [...managedRoles];
                                      newRoles[index] = updatedRole;
                                      setManagedRoles(newRoles);
                                    }
                                  }}
                                  className="block w-20 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:text-blue-600"
                                  onClick={() => setEditingRoleId(role.id)}
                                >
                                  {role.capacity}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {editingRoleId === role.id ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleUpdateRole(role.id, {
                                      title: managedRoles.find(r => r.id === role.id)?.title || "",
                                      description: managedRoles.find(r => r.id === role.id)?.description || "",
                                      capacity: managedRoles.find(r => r.id === role.id)?.capacity || 1
                                    })}
                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => setEditingRoleId(null)}
                                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDeleteRole(role.id)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  削除
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-4">
                  新しい役職を追加
                </h3>

                <form onSubmit={handleAddRole} className="space-y-4">
                  <div>
                    <label htmlFor="role-title" className="block text-sm font-medium text-gray-700">
                      役職名
                    </label>
                    <input
                      type="text"
                      id="role-title"
                      value={newRole.title}
                      onChange={(e) => {
                        const maxId = Math.max(0, ...managedRoles.map(role => Number(role.id) || 0));
                        setNewRole({ ...newRole, id: String(maxId + 1), title: e.target.value });
                      }}
                      placeholder="例: システム管理係"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="role-description" className="block text-sm font-medium text-gray-700">
                      説明
                    </label>
                    <textarea
                      id="role-description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      placeholder="役職の説明を入力してください"
                      rows={3}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="role-capacity" className="block text-sm font-medium text-gray-700">
                      定員
                    </label>
                    <input
                      type="number"
                      id="role-capacity"
                      min="1"
                      value={newRole.capacity}
                      onChange={(e) => setNewRole({ ...newRole, capacity: parseInt(e.target.value) || 1 })}
                      className="mt-1 block w-32 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      追加
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                管理者メールアドレスの管理
              </h2>

              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  データベースの管理者メールアドレス
                </h3>

                <div className="flex items-center mb-4">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="新しい管理者のメールアドレス"
                    className="block w-full sm:w-96 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  />
                  <button
                    onClick={handleAddAdminEmail}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    追加
                  </button>
                </div>

                {envAdminEmails.length === 0 && adminEmails.length === 0 ? (
                  <p className="text-gray-500 italic">
                    データベースに管理者メールアドレスが登録されていません。
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                    {envAdminEmails.map((email) => (
                      <li key={email} className="py-3 flex justify-between items-center">
                        <span className="text-gray-700">{email}</span>
                      </li>
                    ))}
                    {adminEmails.map((email) => (
                      <li key={email} className="py-3 flex justify-between items-center">
                        <span className="text-gray-700">{email}</span>
                        <button
                          onClick={() => handleRemoveAdminEmail(email)}
                          className="ml-3 inline-flex justify-center py-1 px-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
