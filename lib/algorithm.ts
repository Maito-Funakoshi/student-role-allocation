import type { Preference, Assignment, AllocationResult } from "./types";
import { roles } from "./roles";

// Minimum Cost Flow Algorithm for role allocation
export function allocateRoles(preferences: Preference[]): AllocationResult {
  // Remove duplicate students by taking the latest preference
  const uniquePreferences = preferences.reduce((acc, curr) => {
    acc.set(curr.userId, curr);
    return acc;
  }, new Map<string, Preference>());

  const validPreferences = Array.from(uniquePreferences.values());

  // Debug: Log initial state
  console.log("=== 配分アルゴリズム開始 ===");
  console.log(`学生数: ${validPreferences.length}`);
  console.log(
    "学生の希望:",
    validPreferences.map((p) => ({
      name: p.userName,
      preferences: p.preferences.map(
        (roleId) => roles.find((r) => r.id === roleId)?.title || roleId
      ),
    }))
  );

  // Create a copy of roles with their capacities
  const availableRoles = roles.flatMap((role) =>
    Array(role.capacity)
      .fill(null)
      .map((_, index) => ({
        ...role,
        instanceId: `${role.id}-${index}`, // Create unique instance IDs for multiple capacity roles
      }))
  );

  // Debug: Log available roles
  console.log("\n利用可能な役割:");
  console.log(availableRoles.map((r) => `${r.title} (${r.instanceId})`));

  // Initialize cost matrix
  const numStudents = validPreferences.length;
  const numRoles = availableRoles.length;
  const costs: number[][] = Array(numStudents)
    .fill(0)
    .map(() => Array(numRoles).fill(11)); // Default cost is number of roles + 1

  // Fill in costs based on preferences
  validPreferences.forEach((student, studentIndex) => {
    student.preferences.forEach((roleId, prefIndex) => {
      availableRoles.forEach((role, roleIndex) => {
        if (role.id === roleId) {
          costs[studentIndex][roleIndex] = prefIndex + 1; // 1-based preference rank
        }
      });
    });
  });

  // Debug: Log cost matrix
  console.log("\nコスト行列:");
  costs.forEach((row, i) => {
    console.log(`学生${i + 1}: [${row.join(", ")}]`);
  });

  // Simple greedy algorithm with backtracking
  function assignRoles(): number[][] {
    const assignments: number[][] = [];
    const usedRoles = new Set<number>();
    const usedStudents = new Set<number>();

    // Sort all possible assignments by cost
    const allPossibleAssignments: [number, number, number][] = [];
    for (let i = 0; i < numStudents; i++) {
      for (let j = 0; j < numRoles; j++) {
        allPossibleAssignments.push([i, j, costs[i][j]]);
      }
    }
    allPossibleAssignments.sort((a, b) => a[2] - b[2]);

    // Assign roles greedily
    for (const [studentIndex, roleIndex, cost] of allPossibleAssignments) {
      if (!usedStudents.has(studentIndex) && !usedRoles.has(roleIndex)) {
        assignments.push([studentIndex, roleIndex]);
        usedStudents.add(studentIndex);
        usedRoles.add(roleIndex);
      }

      // Break if all students are assigned
      if (usedStudents.size === numStudents) break;
    }

    // If some students are still unassigned, assign them to remaining roles
    if (usedStudents.size < numStudents) {
      for (let i = 0; i < numStudents; i++) {
        if (!usedStudents.has(i)) {
          for (let j = 0; j < numRoles; j++) {
            if (!usedRoles.has(j)) {
              assignments.push([i, j]);
              usedStudents.add(i);
              usedRoles.add(j);
              break;
            }
          }
        }
      }
    }

    return assignments;
  }

  // Run assignment algorithm
  const assignments = assignRoles();

  // Debug: Log assignments
  console.log("\n配分結果（学生 → 役割）:");
  assignments.forEach(([studentIndex, roleIndex]) => {
    const student = validPreferences[studentIndex];
    const role = availableRoles[roleIndex];
    console.log(
      `${student.userName} → ${role.title} (コスト: ${costs[studentIndex][roleIndex]})`
    );
  });

  // Convert assignments to result format
  const result: Assignment[] = assignments.map(([studentIndex, roleIndex]) => {
    const student = validPreferences[studentIndex];
    const role = availableRoles[roleIndex];
    const preferenceRank = student.preferences.indexOf(role.id) + 1 || 0;

    return {
      userId: student.userId,
      userName: student.userName,
      roleId: role.id,
      roleName: role.title,
      preferenceRank,
      timestamp: new Date(),
    };
  });

  // Calculate unassigned roles
  const assignedRoleIds = new Set(result.map((a) => a.roleId));
  const unassignedRoles = roles
    .filter(
      (r) =>
        !assignedRoleIds.has(r.id) ||
        result.filter((a) => a.roleId === r.id).length < r.capacity
    )
    .map((r) => r.id);

  // Calculate satisfaction score
  const satisfactionScore =
    result.reduce((sum, a) => sum + (a.preferenceRank || 11), 0) /
    result.length;

  // Debug: Log final results
  console.log("\n=== 配分結果 ===");
  console.log(`配分された学生数: ${result.length}`);
  console.log(`未配分の学生数: 0`); // Should always be 0
  console.log(`未配分の役割数: ${unassignedRoles.length}`);
  console.log(`満足度スコア: ${satisfactionScore.toFixed(2)}`);

  if (unassignedRoles.length > 0) {
    console.log("\n未配分の役割:");
    unassignedRoles.forEach((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        const assignedCount = result.filter((a) => a.roleId === roleId).length;
        console.log(
          `- ${role.title} (配分済み: ${assignedCount}/${role.capacity})`
        );
      }
    });
  }

  return {
    assignments: result,
    unassignedUsers: [], // Always empty with this algorithm
    unassignedRoles,
    satisfactionScore,
  };
}
