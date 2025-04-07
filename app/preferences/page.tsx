"use client";

import { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "@/lib/auth";
import { roles, getRoles } from "@/lib/roles";
import { savePreferences, getPreference, deletePreferences } from "@/lib/database";
import Layout from "@/components/layout";
import AuthGuard from "@/components/auth-guard";

interface DraggableRoleProps {
  id: string;
  title: string;
  description: string;
  index: number;
  moveRole: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableRole = ({
  id,
  title,
  description,
  index,
  moveRole,
}: DraggableRoleProps) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: "ROLE",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: "ROLE",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveRole(item.index, index);
        item.index = index;
      }
    },
  });

  const ref = (element: HTMLDivElement | null) => {
    dragRef(element);
    dropRef(element);
  };

  return (
    <div
      ref={ref}
      className={`p-4 mb-2 bg-white rounded-lg shadow border ${isDragging ? "opacity-50 border-gray-400" : "border-gray-200"
        }`}
    >
      <div className="flex items-center">
        {/* <div className="mr-4 text-gray-500 text-lg font-bold">{index + 1}</div> */}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default function Preferences() {
  const { user } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState(roles);
  const [dbRoles, setDbRoles] = useState<typeof roles>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");

  // Load roles from database
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await getRoles();
        setDbRoles(rolesData);
        setAvailableRoles(rolesData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading roles:", error);
        setError("役職の読み込みに失敗しました");
        setLoading(false);
      }
    };

    loadRoles();
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      if (user && dbRoles.length > 0) {
        const preference = await getPreference(user.uid);
        if (preference) {
          setSelectedRoles(preference.preferences);

          // Update available roles
          const selectedRoleIds = new Set(preference.preferences);
          setAvailableRoles(
            dbRoles.filter((role) => !selectedRoleIds.has(role.id))
          );
        }
      }
    };

    loadPreferences();
  }, [user, dbRoles]);

  const handleAddRole = (roleId: string) => {
    if (selectedRoles.length >= 10) {
      setError("最大10個の役職まで選択できます");
      return;
    }

    setSelectedRoles([...selectedRoles, roleId]);
    setAvailableRoles(availableRoles.filter((role) => role.id !== roleId));
    setError("");
  };

  const handleRemoveRole = (index: number) => {
    const roleId = selectedRoles[index];
    const role = dbRoles.find((r) => r.id === roleId);

    if (role) {
      const newSelectedRoles = [...selectedRoles];
      newSelectedRoles.splice(index, 1);
      setSelectedRoles(newSelectedRoles);

      // availableRolesに役職を戻し、元の順番にソート
      setAvailableRoles((prevAvailableRoles) => {
        const updatedRoles = [...prevAvailableRoles, role];
        return updatedRoles.sort((a, b) => {
          const indexA = dbRoles.findIndex((r) => r.id === a.id);
          const indexB = dbRoles.findIndex((r) => r.id === b.id);
          return indexA - indexB;
        });
      });
    }
  };

  const moveRole = (dragIndex: number, hoverIndex: number) => {
    const newSelectedRoles = [...selectedRoles];
    const draggedRole = newSelectedRoles[dragIndex];
    newSelectedRoles.splice(dragIndex, 1);
    newSelectedRoles.splice(hoverIndex, 0, draggedRole);
    setSelectedRoles(newSelectedRoles);
  };

  const handleSavePreferences = async () => {
    if (selectedRoles.length < 3) {
      setError("最低3つの役職を選択してください");
      return;
    }

    if (!user) return;

    setSaving(true);
    setError("");

    try {
      await savePreferences({
        userId: user.uid,
        userName: user.displayName,
        preferences: selectedRoles,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreferences = async () => {
    const userConfirmed = confirm("希望を削除してもよろしいでしょうか？");
    if (!userConfirmed) return;

    if (!user) return;

    try {
      await deletePreferences(user.uid); // データベースから希望を削除
      setSelectedRoles([]); // UIの状態をリセット
      const rolesData = await getRoles();
      setAvailableRoles(rolesData);
      setDeleted(true);
      setTimeout(() => setDeleted(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete preferences");
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-bold text-gray-900">役職の希望調査</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              希望する役職を3つ以上選択し、ドラッグして上から優先順位の高い順に並べ替えてください
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {saved && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                希望が正常に保存されました！
              </div>
            )}
            {deleted && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                希望が削除されました
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  あなたの希望 ({selectedRoles.length}/{dbRoles.length})
                </h2>
                <DndProvider backend={HTML5Backend}>
                  <div className="space-y-2">
                    {selectedRoles.length === 0 ? (
                      <p className="text-gray-500 italic">
                        まだ役職が選択されていません。右側のリストから役職を追加してください。
                      </p>
                    ) : (
                      selectedRoles.map((roleId, index) => {
                        const role = dbRoles.find((r) => r.id === roleId);
                        if (!role) return null;

                        return (
                          <div key={roleId} className="relative">
                            <DraggableRole
                              id={role.id}
                              title={role.title}
                              description={role.description}
                              index={index}
                              moveRole={moveRole}
                            />
                            <button
                              onClick={() => handleRemoveRole(index)}
                              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DndProvider>

                <div className="flex mt-6 gap-4">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving || selectedRoles.length < 3}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "希望を保存"}
                  </button>

                  <button
                    onClick={handleDeletePreferences}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    希望を削除
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  役職の選択肢
                </h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {availableRoles.length === 0 ? (
                    <p className="text-gray-500 italic">
                      All roles have been selected.
                    </p>
                  ) : (
                    availableRoles.map((role) => (
                      <div
                        key={role.id}
                        className="p-4 bg-white rounded-lg shadow border border-gray-200 hover:border-gray-400 cursor-pointer"
                        onClick={() => handleAddRole(role.id)}
                      >
                        <h3 className="text-lg font-medium text-gray-900">
                          {role.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {role.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
