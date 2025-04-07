"use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/layout";

export default function Home() {
  const { user, loading } = useAuth();
  // const router = useRouter();

  // 何かしらの意図があっての設計かもしれないのでコメントアウトに留めておく
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.push("/preferences");
  //     router.refresh();
  //   }
  // }, [user, loading, router]);

  return (
    <Layout>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">
            役職配分システム
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            学生の希望に基づいて役職を配分するシステム
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="prose max-w-none">
            <p>
              学生役職配分システムへようこそ。
            </p>
            <p>
              このアプリケーションは、学生の希望に基づいて様々な役職を配分するためのシステムです。
            </p>
            <h2 className="font-bold mt-1">システムの仕組み</h2>
            <ol>
              <li>学生が登録し、役職の希望順位を提出します。</li>
              <li>管理者が希望を確認し、配分アルゴリズムを実行します。</li>
              <li>
                システムは学生の希望と役職の空き状況に基づいて、自動的に役職を割り当てます。
              </li>
              <li>
                最終的な役職の割り当ては、全学生が閲覧できるように公開されます。
              </li>
            </ol>
            <h2 className="font-bold mt-1">はじめ方</h2>
            <p>
              {loading ? (
                "読み込み中..."
              ) : user ? (
                <>
                  <strong>{user.displayName}</strong>としてログインしています。{" "}
                  <Link href="/preferences" className="text-gray-900 underline">
                    希望調査
                  </Link>{" "}
                  ページで役職の希望を提出してください。
                </>
              ) : (
                <>
                  開始するには{" "}
                  <Link href="/login" className="text-gray-900 underline">
                    ログイン
                  </Link>{" "}
                  または{" "}
                  <Link href="/register" className="text-gray-900 underline">
                    新規登録
                  </Link>{" "}
                  してください。
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
