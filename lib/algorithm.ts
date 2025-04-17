import type { Preference, Assignment, AllocationResult } from "./types";
import { roles } from "./roles";

// 公平な役職配分のための最適化アルゴリズム
export function allocateRoles(preferences: Preference[], managedRoles: typeof roles): AllocationResult {
  // 重複学生の削除（最新の希望を採用）
  const uniquePreferences = preferences.reduce((acc, curr) => {
    acc.set(curr.userId, curr);
    return acc;
  }, new Map<string, Preference>());

  const validPreferences = Array.from(uniquePreferences.values());

  const trialCount = 100; // 試行回数を増やして最適解を見つける確率を上げる
  let bestResult: AllocationResult | null = null;
  let bestMaxStudentDissatisfaction = Infinity; // 最悪の学生の不満度を最小化

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

    // 最も不満度が高い学生を基準に評価
    const maxDissatisfaction = result.maxStudentDissatisfaction;
    console.log(`試行 ${trial} の最大不満度: ${maxDissatisfaction.toFixed(2)}, 平均満足度: ${result.satisfactionScore.toFixed(2)}`);

    // 最大不満度が最小になる結果を保存
    if (maxDissatisfaction < bestMaxStudentDissatisfaction ||
      (maxDissatisfaction === bestMaxStudentDissatisfaction && result.satisfactionScore < (bestResult?.satisfactionScore || Infinity))) {
      bestResult = result;
      bestMaxStudentDissatisfaction = maxDissatisfaction;
      console.log(`★ 新しい最良スコアを発見: 最大不満度=${bestMaxStudentDissatisfaction.toFixed(2)}, 平均満足度=${result.satisfactionScore.toFixed(2)}`);
    }
  }

  console.log("\n=== 最終結果 ===");
  console.log(`最大不満度: ${bestMaxStudentDissatisfaction.toFixed(2)}`);
  console.log(`平均満足度: ${bestResult!.satisfactionScore.toFixed(2)}`);

  return bestResult!;
}

// 役職配分の実行アルゴリズム
function performAllocation(validPreferences: Preference[], managedRoles: typeof roles): AllocationResult {
  // Debug: Log initial state
  console.log("=== 配分アルゴリズム開始 ===");
  console.log(
    "学生の希望:",
    validPreferences.map((p) => ({
      name: p.userName,
      preferences: p.preferences.map(
        (roleId) => managedRoles.find((r) => r.id === roleId)?.title || roleId
      ),
    }))
  );

  // 役職インスタンスの作成
  const availableRoles = managedRoles.flatMap((role) =>
    Array(role.capacity)
      .fill(null)
      .map((_, index) => ({
        ...role,
        instanceId: `${role.id}-${index}`,
      }))
  );

  console.log("\n利用可能な役職:", availableRoles.map((r) => `${r.title} (${r.instanceId})`));

  // 総役職数の計算
  const totalRoleSlots = availableRoles.length;
  const numStudents = validPreferences.length;

  // 学生あたりの役職数範囲を計算（公平な配分のため）
  const minRolesPerStudent = Math.floor(totalRoleSlots / numStudents);
  const maxRolesPerStudent = Math.ceil(totalRoleSlots / numStudents);
  const studentsWithExtraRole = totalRoleSlots % numStudents; // 追加の役職を受け取る学生数

  console.log(`\n学生あたりの役職数: ${minRolesPerStudent}～${maxRolesPerStudent}`);
  console.log(`追加役職を受け取る学生数: ${studentsWithExtraRole}`);

  // コスト行列の初期化
  const numRoles = availableRoles.length;

  // 指数関数的なコスト計算のための基本コスト
  const baseCost = managedRoles.length * 2;

  const costs: number[][] = Array(numStudents)
    .fill(0)
    .map(() => Array(numRoles).fill(baseCost)); // 希望外の役職には高いコスト


  // 希望に基づくコストの設定（指数関数的に増加）
  validPreferences.forEach((student, studentIndex) => {
    student.preferences.forEach((roleId, prefIndex) => {
      availableRoles.forEach((role, roleIndex) => {
        if (role.id === roleId) {
          // 指数関数的なコスト: 1, 3, 9, 27, ...
          costs[studentIndex][roleIndex] = Math.pow(3, prefIndex);
        }
      });
    });
  });

  console.log("\nコスト行列:");
  costs.forEach((row, i) => {
    console.log(`学生${i + 1}: [${row.join(", ")}]`);
  });

  // 役職割り当てアルゴリズム
  function assignRoles(): [number[][], number[]] {
    const assignments: number[][] = [];
    const usedRoles = new Set<number>();

    // 各学生の割り当て数を追跡
    const studentAssignmentCount = new Array(numStudents).fill(0);

    // 各学生に割り当てられた役職タイプを追跡
    const studentAssignedRoleIds = Array(numStudents)
      .fill(null)
      .map(() => new Set<string>());

    // 各学生の合計コスト（満足度）を追跡
    const studentTotalCost = new Array(numStudents).fill(0);

    // ステップ1: 全学生に最低限の役職数を割り当てる

    // まず、各学生の最優先希望を可能な限り割り当てる
    for (let studentIndex = 0; studentIndex < numStudents; studentIndex++) {
      // すべての役職に対するコストをソート
      const roleOptions = Array.from({ length: numRoles }, (_, roleIndex) => [
        roleIndex,
        costs[studentIndex][roleIndex]
      ]).sort((a, b) => a[1] - b[1]);

      // 最優先の役職を見つけて割り当てる
      for (const [roleIndex, cost] of roleOptions) {
        if (!usedRoles.has(roleIndex)) {
          assignments.push([studentIndex, roleIndex]);
          usedRoles.add(roleIndex);
          studentAssignmentCount[studentIndex]++;
          studentTotalCost[studentIndex] += cost;
          studentAssignedRoleIds[studentIndex].add(availableRoles[roleIndex].id);
          break;
        }
      }
    }

    // ステップ2: 残りの最低限の役職を満足度を考慮して割り当てる
    while (assignments.length < numStudents * minRolesPerStudent) {
      let bestAssignment: [number, number] | null = null;
      let bestScore = Infinity;

      // 各学生と未割り当て役職の組み合わせをチェック
      for (let studentIndex = 0; studentIndex < numStudents; studentIndex++) {
        // 最低限必要な役職数に達している場合はスキップ
        if (studentAssignmentCount[studentIndex] >= minRolesPerStudent) continue;

        for (let roleIndex = 0; roleIndex < numRoles; roleIndex++) {
          // すでに使用されている役職はスキップ
          if (usedRoles.has(roleIndex)) continue;

          // この学生がすでにこの役職タイプを持っている場合はスキップ
          const baseRoleId = availableRoles[roleIndex].id;
          if (studentAssignedRoleIds[studentIndex].has(baseRoleId)) continue;

          // コスト（不満度）を考慮したスコア
          const cost = costs[studentIndex][roleIndex];
          const score = cost;

          if (score < bestScore) {
            bestScore = score;
            bestAssignment = [studentIndex, roleIndex];
          }
        }
      }

      // 割り当てを実行
      if (bestAssignment !== null) {
        const [studentIndex, roleIndex] = bestAssignment;
        assignments.push([studentIndex, roleIndex]);
        usedRoles.add(roleIndex);
        studentAssignmentCount[studentIndex]++;
        studentTotalCost[studentIndex] += costs[studentIndex][roleIndex];
        // 役職タイプ重複チェックを緩和する場合はここでは追加しない
        const baseRoleId = availableRoles[roleIndex].id;
        studentAssignedRoleIds[studentIndex].add(baseRoleId);
      } else {
        // 割り当てが不可能な場合（通常発生しない）
        console.error("役職割り当てエラー: 最低限の役職割り当てができません");
        break;
      }
    }

    // ステップ3: 追加の役職を割り当てる（一部の学生にmaxRolesPerStudent）
    // 不満度が低い学生を優先的に良い役職を割り当てる

    // 追加の役職を受け取る必要のある学生数
    let remainingExtraRoles = studentsWithExtraRole;

    // 現在の不満度（平均コスト）に基づいて学生を優先順位付け
    while (remainingExtraRoles > 0) {
      // 各学生の現在の平均コストを計算
      const studentAverageCosts: [number, number][] = studentAssignmentCount.map(
        (count, studentIndex) => {
          const averageCost = count > 0
            ? studentTotalCost[studentIndex] / count
            : 0;
          return [studentIndex, averageCost];
        }
      );

      // 平均コストが低い（不満度が低い）順にソート - ここを変更
      studentAverageCosts.sort((a, b) => a[1] - b[1]);

      // 割り当て数がまだmaxRolesPerStudentに達していない学生のみフィルタ
      const eligibleStudents = studentAverageCosts.filter(
        ([studentIndex]) => studentAssignmentCount[studentIndex] < maxRolesPerStudent
      );

      if (eligibleStudents.length === 0) break;

      // 最も不満度が低い対象学生 - 変数名を変更
      const [priorityStudentIndex] = eligibleStudents[0];

      // この学生に最適な未割り当て役職を見つける
      let bestRoleIndex = -1;
      let bestCost = Infinity;

      for (let roleIndex = 0; roleIndex < numRoles; roleIndex++) {
        if (!usedRoles.has(roleIndex)) {
          const baseRoleId = availableRoles[roleIndex].id;

          // すでにこの役職タイプを持っている場合は必ずスキップ
          if (studentAssignedRoleIds[priorityStudentIndex].has(baseRoleId)) {
            continue;
          }

          // 新しい役職タイプで、より良いコストのものを選択
          if (costs[priorityStudentIndex][roleIndex] < bestCost) {
            bestRoleIndex = roleIndex;
            bestCost = costs[priorityStudentIndex][roleIndex];
          }
        }
      }

      // 最適な役職を割り当て
      if (bestRoleIndex !== -1) {
        assignments.push([priorityStudentIndex, bestRoleIndex]);
        usedRoles.add(bestRoleIndex);
        studentAssignmentCount[priorityStudentIndex]++;
        studentTotalCost[priorityStudentIndex] += costs[priorityStudentIndex][bestRoleIndex];
        studentAssignedRoleIds[priorityStudentIndex].add(availableRoles[bestRoleIndex].id);
        remainingExtraRoles--;
      } else {
        // 割り当てできる役職がない場合
        break;
      }
    }





    // ステップ4: 残りの未割り当て役職があれば割り当てる
    // できるだけ公平に、各学生の役職数の差が最大1になるようにする
    for (let roleIndex = 0; roleIndex < numRoles; roleIndex++) {
      if (!usedRoles.has(roleIndex)) {
        // 割り当て数が最も少ない学生のうち、この役職タイプをまだ持っていない人を見つける
        let bestStudentIndex = -1;
        let minAssignmentCount = Infinity;

        for (let i = 0; i < numStudents; i++) {
          const baseRoleId = availableRoles[roleIndex].id;
          // この学生がすでにこの役職タイプを持っている場合はスキップ
          if (studentAssignedRoleIds[i].has(baseRoleId)) continue;

          if (studentAssignmentCount[i] < minAssignmentCount) {
            bestStudentIndex = i;
            minAssignmentCount = studentAssignmentCount[i];
          }
        }

        // 割り当て可能な学生が見つかった場合のみ割り当てを実行
        if (bestStudentIndex !== -1) {
          assignments.push([bestStudentIndex, roleIndex]);
          usedRoles.add(roleIndex);
          studentAssignmentCount[bestStudentIndex]++;
          studentTotalCost[bestStudentIndex] += costs[bestStudentIndex][roleIndex];
          const baseRoleId = availableRoles[roleIndex].id;
          studentAssignedRoleIds[bestStudentIndex].add(baseRoleId);
        }
      }
    }

    return [assignments, studentTotalCost];
  }

  // 役職割り当て実行
  const [assignments, studentTotalCost] = assignRoles();

  let IdIndex = 0;

  // 割り当て結果をフォーマット
  const result: Assignment[] = assignments
    .map(([studentIndex, roleIndex]) => {
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
    })
    .sort((a, b) => a.userName.localeCompare(b.userName)); // ユーザー名でソート

  // 未割り当て役職の計算
  const assignedRoleIdCounts = new Map<string, number>();
  assignments.forEach(([_, roleIndex]) => {
    const roleId = availableRoles[roleIndex].id;
    assignedRoleIdCounts.set(roleId, (assignedRoleIdCounts.get(roleId) || 0) + 1);
  });

  const unassignedRoleIds = new Set<string>();
  managedRoles.forEach((role) => {
    const assignedCount = assignedRoleIdCounts.get(role.id) || 0;
    if (assignedCount < role.capacity) {
      unassignedRoleIds.add(role.id);
    }
  });

  // 平均満足度スコアの計算
  const satisfactionScore =
    result.reduce((sum, a) => sum + (a.preferenceRank || baseCost), 0) / result.length;

  // 各学生の役職と満足度の分析
  const studentSatisfactionData = validPreferences.map((student, index) => {
    const studentAssignments = result.filter((a) =>
      a.userId.startsWith(student.userId + "-")
    );
    const roleIds = new Set(studentAssignments.map((a) => a.roleId));

    // 平均満足度（平均コスト）
    const avgCost = studentTotalCost[index] / (studentAssignments.length || 1);

    // 不満度スコア（コストが高いほど不満）
    const dissatisfactionScore = avgCost;

    return {
      name: student.userName,
      count: studentAssignments.length,
      distinctRoles: roleIds.size,
      assignments: studentAssignments.map(a => ({
        role: a.roleName,
        preferenceRank: a.preferenceRank || "希望なし"
      })),
      dissatisfactionScore
    };
  });

  // 最大不満度を計算（最も不満な学生の不満度）
  const maxStudentDissatisfaction = Math.max(...studentSatisfactionData.map(s => s.dissatisfactionScore));

  // 結果のログ出力
  console.log("\n=== 配分結果 ===");
  console.log(`配分された役職の総数: ${result.length}`);

  console.log("\n各学生の役職と満足度:");
  studentSatisfactionData.forEach(({ name, count, assignments, dissatisfactionScore }) => {
    console.log(`- ${name}: ${count}個の役職, 不満度=${dissatisfactionScore.toFixed(2)}`);
    assignments.forEach(a => {
      console.log(`  * ${a.role} (希望順位: ${a.preferenceRank})`);
    });
  });

  console.log(`\n最も不満度が高い学生の不満度: ${maxStudentDissatisfaction.toFixed(2)}`);
  console.log(`平均満足度スコア: ${satisfactionScore.toFixed(2)}`);

  if (unassignedRoleIds.size > 0) {
    console.log("\n未配分の役職:");
    Array.from(unassignedRoleIds).forEach((roleId) => {
      const role = managedRoles.find((r) => r.id === roleId);
      if (role) {
        const assignedCount = result.filter((a) => a.roleId === roleId).length;
        console.log(`- ${role.title} (配分済み: ${assignedCount}/${role.capacity})`);
      }
    });
  }

  return {
    assignments: result,
    unassignedUsers: [], // このアルゴリズムでは常に空
    unassignedRoles: Array.from(unassignedRoleIds),
    satisfactionScore,
    maxStudentDissatisfaction, // 新しい評価指標を追加
    studentSatisfactionData, // 各学生の詳細な満足度データ
  };
}