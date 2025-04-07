import type { Preference, Assignment, AllocationResult } from "./types";
import { roles } from "./roles";

// Minimum Cost Flow Algorithm for role allocation with multiple assignments per student
export function allocateRoles(preferences: Preference[], managedRoles: typeof roles): AllocationResult {
  // Remove duplicate students by taking the latest preference
  const uniquePreferences = preferences.reduce((acc, curr) => {
    acc.set(curr.userId, curr);
    return acc;
  }, new Map<string, Preference>());

  const validPreferences = Array.from(uniquePreferences.values());

  const trialCount = 50; // 約30以上であれば満足度のminが動かなくなる感触
  let bestResult: AllocationResult | null = null;
  let bestSatisfactionScore = Infinity;

  console.log(`=== ${trialCount}回の役職割り振りを実行して最良の結果を選びます ===`);

  for (let trial = 1; trial <= trialCount; trial++) {
    console.log(`\n--- 試行 ${trial}/${trialCount} ---`);

    // 各試行でvalidPreferencesをシャッフル
    const shuffledPreferences = [...validPreferences];
    for (let i = shuffledPreferences.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPreferences[i], shuffledPreferences[j]] = [shuffledPreferences[j], shuffledPreferences[i]];
    }

    // 各試行で役職割り当てを実行
    const result = performAllocation(shuffledPreferences, managedRoles);
    console.log(`試行 ${trial} の満足度スコア: ${result.satisfactionScore.toFixed(2)}`);

    // 最良の結果を保存
    if (result.satisfactionScore < bestSatisfactionScore) {
      bestResult = result;
      bestSatisfactionScore = result.satisfactionScore;
      console.log(`★ 新しい最良スコアを発見: ${bestSatisfactionScore.toFixed(2)}`);
    }
  }

  console.log("\n=== 最終結果 ===");
  console.log(`最良の満足度スコア: ${bestSatisfactionScore.toFixed(2)}`);

  return bestResult!;
}

// 元のallocateRolesの内部ロジックを分離した関数
function performAllocation(validPreferences: Preference[], managedRoles: typeof roles): AllocationResult {
  // Debug: Log initial state
  console.log("=== 配分アルゴリズム開始 ===");
  // console.log(`学生数: ${validPreferences.length}`);
  console.log(
    "学生の希望:",
    validPreferences.map((p) => ({
      name: p.userName,
      preferences: p.preferences.map(
        (roleId) => managedRoles.find((r) => r.id === roleId)?.title || roleId
      ),
    }))
  );

  // Create a copy of roles with their capacities
  const availableRoles = managedRoles.flatMap((role) =>
    Array(role.capacity)
      .fill(null)
      .map((_, index) => ({
        ...role,
        instanceId: `${role.id}-${index}`, // Create unique instance IDs for multiple capacity roles
      }))
  );

  // Debug: Log available roles
  console.log("\n利用可能な　役職:", availableRoles.map((r) => `${r.title} (${r.instanceId})`));

  // Calculate total roles needed to be filled
  const totalRoleSlots = availableRoles.length;

  // Calculate minimum required roles per student
  // If there are more roles than students, some students must take multiple roles
  const minRolesPerStudent = Math.floor(totalRoleSlots / validPreferences.length);
  const extraRoles = totalRoleSlots % validPreferences.length;

  console.log(`\n各学生の最低役職数: ${minRolesPerStudent}`);
  console.log(`追加で割り当てる必要のある役職数: ${extraRoles}`);

  // Initialize cost matrix
  const numStudents = validPreferences.length;
  const numRoles = availableRoles.length;
  const costs: number[][] = Array(numStudents)
    .fill(0)
    .map(() => Array(numRoles).fill(managedRoles.length + 1)); // Default cost is number of managedRoles + 1

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

  // Modified assignment algorithm to handle multiple roles per student
  // while preventing multiple instances of the same role
  function assignRoles(): number[][] {
    const assignments: number[][] = [];
    const usedRoles = new Set<number>();
    const studentAssignmentCount = new Array(numStudents).fill(0);
    // Track which base role IDs each student has been assigned to
    const studentAssignedRoleIds = Array(numStudents).fill(null).map(() => new Set<string>());

    // Sort all possible assignments by cost
    const allPossibleAssignments: [number, number, number][] = [];
    for (let i = 0; i < numStudents; i++) {
      for (let j = 0; j < numRoles; j++) {
        allPossibleAssignments.push([i, j, costs[i][j]]);
      }
    }
    allPossibleAssignments.sort((a, b) => a[2] - b[2]);

    // First pass: assign at least minRolesPerStudent to each student
    // Iterate through all possible assignments sorted by cost
    for (const [studentIndex, roleIndex, cost] of allPossibleAssignments) {
      // Skip if the role is already assigned
      if (usedRoles.has(roleIndex)) continue;

      // Skip if the student already has minimum required roles assigned
      if (studentAssignmentCount[studentIndex] >= minRolesPerStudent) continue;

      // Skip if the student is already assigned to this role type
      const baseRoleId = availableRoles[roleIndex].id;
      if (studentAssignedRoleIds[studentIndex].has(baseRoleId)) continue;

      // Make the assignment
      assignments.push([studentIndex, roleIndex]);
      usedRoles.add(roleIndex);
      studentAssignmentCount[studentIndex]++;
      studentAssignedRoleIds[studentIndex].add(baseRoleId);
    }

    // Second pass: distribute extra roles
    // Sort students by current average cost to prioritize those with worse assignments
    const studentAverageCosts: [number, number][] = studentAssignmentCount.map(
      (count, studentIndex) => {
        // Find average cost of current assignments for this student
        const studentAssignments = assignments.filter(
          ([sIndex]) => sIndex === studentIndex
        );

        const averageCost = studentAssignments.length > 0
          ? studentAssignments.reduce(
            (sum, [sIndex, rIndex]) => sum + costs[sIndex][rIndex],
            0
          ) / studentAssignments.length
          : 0;

        return [studentIndex, averageCost];
      }
    );

    // Sort by average cost (descending) so students with worse assignments get priority
    studentAverageCosts.sort((a, b) => b[1] - a[1]);

    // Distribute extra roles by student priority
    let extraRolesAssigned = 0;
    while (extraRolesAssigned < extraRoles) {
      // Get next student in priority queue
      const [priorityStudentIndex] = studentAverageCosts[extraRolesAssigned % numStudents];

      // Find best available role for this student that they haven't already been assigned to
      let bestRoleIndex = -1;
      let bestCost = Infinity;

      for (let roleIndex = 0; roleIndex < numRoles; roleIndex++) {
        if (!usedRoles.has(roleIndex)) {
          const baseRoleId = availableRoles[roleIndex].id;
          // Skip if student already has this role type
          if (studentAssignedRoleIds[priorityStudentIndex].has(baseRoleId)) continue;

          if (costs[priorityStudentIndex][roleIndex] < bestCost) {
            bestRoleIndex = roleIndex;
            bestCost = costs[priorityStudentIndex][roleIndex];
          }
        }
      }

      // Assign the best available role
      if (bestRoleIndex !== -1) {
        assignments.push([priorityStudentIndex, bestRoleIndex]);
        usedRoles.add(bestRoleIndex);
        studentAssignmentCount[priorityStudentIndex]++;
        studentAssignedRoleIds[priorityStudentIndex].add(availableRoles[bestRoleIndex].id);
        extraRolesAssigned++;
      } else {
        // No more roles to assign to this student, move to the next
        extraRolesAssigned++;
        continue;
      }
    }

    // Third pass: Ensure all roles are assigned
    // First try to assign remaining roles to students who don't have that role type yet
    for (let roleIndex = 0; roleIndex < numRoles; roleIndex++) {
      if (!usedRoles.has(roleIndex)) {
        const baseRoleId = availableRoles[roleIndex].id;
        let bestStudentIndex = -1;
        let bestScore = -Infinity;

        // Find eligible student with lowest assignment count and best preference
        for (let studentIndex = 0; studentIndex < numStudents; studentIndex++) {
          // Skip if student already has this role type
          if (studentAssignedRoleIds[studentIndex].has(baseRoleId)) continue;

          // Score based on assignment count (fewer is better) and preference (lower cost is better)
          const assignmentScore = -studentAssignmentCount[studentIndex] * 100 - costs[studentIndex][roleIndex];

          if (assignmentScore > bestScore) {
            bestStudentIndex = studentIndex;
            bestScore = assignmentScore;
          }
        }

        // If we found an eligible student
        if (bestStudentIndex !== -1) {
          assignments.push([bestStudentIndex, roleIndex]);
          usedRoles.add(roleIndex);
          studentAssignmentCount[bestStudentIndex]++;
          studentAssignedRoleIds[bestStudentIndex].add(baseRoleId);
          continue;
        }

        // If no eligible student (all already have this role type),
        // relax the constraint and assign to the student with fewest assignments
        let minAssignedStudent = 0;
        let minAssignmentCount = studentAssignmentCount[0];

        for (let i = 1; i < numStudents; i++) {
          if (studentAssignmentCount[i] < minAssignmentCount) {
            minAssignedStudent = i;
            minAssignmentCount = studentAssignmentCount[i];
          }
        }

        assignments.push([minAssignedStudent, roleIndex]);
        usedRoles.add(roleIndex);
        studentAssignmentCount[minAssignedStudent]++;
        // Note: We deliberately don't add to studentAssignedRoleIds here
        // because we've relaxed the constraint
      }
    }

    return assignments;
  }

  // Run assignment algorithm
  const assignments = assignRoles();

  // Debug: Log assignments
  // console.log("\n配分結果（学生 → 役職）:");
  // assignments.forEach(([studentIndex, roleIndex]) => {
  //   const student = validPreferences[studentIndex];
  //   const role = availableRoles[roleIndex];
  //   console.log(
  //     `${student.userName} → ${role.title} (コスト: ${costs[studentIndex][roleIndex]})`
  //   );
  // });

  let IdIndex = 0;

  // Convert assignments to result format
  const result: Assignment[] = assignments.map(([studentIndex, roleIndex]) => {
    IdIndex += 1;
    const student = validPreferences[studentIndex];
    const role = availableRoles[roleIndex];
    const preferenceRank = student.preferences.indexOf(role.id) + 1 || 0;

    return {
      userId: student.userId + "-" + String(IdIndex),
      userName: student.userName,
      roleId: role.id,
      roleName: role.title,
      preferenceRank,
      timestamp: new Date(),
    };
  });

  // Calculate unassigned roles
  const assignedRoleIdCounts = new Map<string, number>();
  assignments.forEach(([_, roleIndex]) => {
    const roleId = availableRoles[roleIndex].id;
    assignedRoleIdCounts.set(roleId, (assignedRoleIdCounts.get(roleId) || 0) + 1);
  });

  const unassignedRoleIds = new Set<string>();
  managedRoles.forEach(role => {
    // Check if all capacity slots of this role were assigned
    const assignedCount = assignedRoleIdCounts.get(role.id) || 0;
    if (assignedCount < role.capacity) {
      unassignedRoleIds.add(role.id);
    }
  });

  // Calculate satisfaction score
  const satisfactionScore =
    result.reduce((sum, a) => sum + (a.preferenceRank || managedRoles.length + 1), 0) /
    result.length;

  // Count and check roles per student for reporting
  const rolesPerStudent = validPreferences.map(student => {
    const studentAssignments = result.filter(a => a.userId.startsWith(student.userId + "-"));
    const roleIds = new Set(studentAssignments.map(a => a.roleId));

    // Verify no duplicate role assignments
    if (roleIds.size !== studentAssignments.length) {
      console.warn(`Warning: ${student.userName} has duplicate role assignments!`);
    }

    return {
      name: student.userName,
      count: studentAssignments.length,
      distinctRoles: roleIds.size
    };
  });

  // Debug: Log final results
  console.log("\n=== 配分結果 ===");
  console.log(`配分された役職の総数: ${result.length}`);
  // console.log(`各学生の役職数:`);
  // rolesPerStudent.forEach(({ name, count, distinctRoles }) => {
  //   console.log(`- ${name}: ${count}個の役職 (異なる役職: ${distinctRoles})`);
  // });

  console.log(`未配分の役職数: ${unassignedRoleIds.size}`);
  console.log(`満足度スコア: ${satisfactionScore.toFixed(2)}`);

  if (unassignedRoleIds.size > 0) {
    console.log("\n未配分の役職:");
    Array.from(unassignedRoleIds).forEach((roleId) => {
      const role = managedRoles.find((r) => r.id === roleId);
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
    unassignedRoles: Array.from(unassignedRoleIds),
    satisfactionScore,
  };
}
