import { getAllRoles, initializeRolesIfEmpty } from "./database"
import type { Role } from "./types"

// Default roles to use if none exist in the database
export const defaultRoles: Role[] = [
  {
    id: "0",
    title: "システム管理係",
    description: "大きな仕事は春の新入りさんのアカウント作りと，秋の停電対応。 その他，サーバーとかwikiとかに何か起こったら対応する．",
    capacity: 2,
  },
  {
    id: "1",
    title: "実験TA",
    description: "３年生後期実験のTA。3年生にOpenCV/OpenGLの課題をしてもらい、質問に答える。 期間中は週3回＊3時間の拘束。他の仕事と違って給料が出るが、その時間の授業は履修できない両刃の剣。",
    capacity: 2,
  },
  {
    id: "2",
    title: "メディアコンテンツTA",
    description: "冬学期の木曜6限に開講されるメディアコンテンツ特別講義II（オムニバス講義）のTA。 質問者にマイクを渡すなどのお仕事。",
    capacity: 1,
  },
  {
    id: "3",
    title: "勉強会係",
    description: "B4と外の研究室出身のM1向けに，毎週勉強会を開いています．",
    capacity: 1,
  },
  {
    id: "4",
    title: "オープンハウス係",
    description: "オープンハウスの幹事です．幹事なだけで，オープンハウスの仕事自体はM1全員で分担します．何でも一人でやってしまう人が担当するよりは，こいつに丸投げしてたらヤバイと言う人が担当するのが吉．",
    capacity: 1,
  },
  {
    id: "5",
    title: "機材、工房管理係",
    description: "ソフトウェア管理係と兼任することが多いようです．主な仕事は，年度始まりに研究室メンバー全員が夜間休日在室届システムへ登録されている状態にすることと，13号館 一般実験室を使いそうなメンバーを登録することくらい．逆にこの2つはきちんとやるようにしてください",
    capacity: 2,
  },
  {
    id: "6",
    title: "コンパ係",
    description: "主な仕事は、新入生歓迎コンパと追い出しコンパです。その他の内部のコンパの手配もすることがあります。役割柄、お金の管理をするため、研究室共益費の会計もかねているといえます。コンパでは、写真を残して行きましょう。",
    capacity: 1,
  },
  {
    id: "7",
    title: "旅行係",
    description: "例年、秋口(9月中旬～下旬)に行われている研究室旅行の幹事です。コンパ係が兼任することが多いです。",
    capacity: 1,
  },
]

// Function to get roles from the database
// If no roles exist, it will initialize with the default roles
export const getRoles = async (): Promise<Role[]> => {
  return await initializeRolesIfEmpty(defaultRoles)
}

// For backward compatibility with existing code
// This will be populated after the first call to getRoles()
export let roles: Role[] = [...defaultRoles]

// Initialize roles on module load
getRoles().then(dbRoles => {
  roles = dbRoles
}).catch(error => {
  console.error("Failed to initialize roles:", error)
  // Keep using default roles if there's an error
})
