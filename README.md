# 学生役割配分システム (Student Role Allocation System)

学生の希望に基づいて様々な役割を配分するためのNext.jsとFirebaseで構築されたWebアプリケーションです。公平で満足度の高い配分を実現するためのマッチングアルゴリズムを実装しています。

## 機能 (Features)

- **ユーザー認証**: 学生がシステムに登録・ログインできます
- **Google認証**: Googleアカウントでのシンプルなサインインが可能です
- **希望入力**: 学生は役割の希望を提出し、優先順位をつけることができます（最大10個まで）
- **管理者インターフェース**: 管理者は全学生の希望を確認し、配分アルゴリズムを実行できます
- **結果表示**: 配分結果が公開された後、全ユーザーが最終的な役割配分を確認できます
- **マッチングアルゴリズム**: 役割配分を最適化するための安定マッチングアルゴリズムを実装

## 使用技術 (Technologies Used)

- **フロントエンド**: Next.js, React, Tailwind CSS
- **バックエンド**: Firebase (Authentication, Firestore)
- **状態管理**: React Hooks
- **UIコンポーネント**: Tailwind CSSを使用したカスタムコンポーネント

## 始め方 (Getting Started)

### 前提条件 (Prerequisites)

- Node.js (v14以降)
- npm または yarn
- Firebaseアカウント

### インストール (Installation)

1. リポジトリのクローン:
   ```bash
   git clone https://github.com/nae-lab/student-role-allocation
   cd student-role-allocation
   ```

2. 依存関係のインストール:
   ```bash
   pnpm install
   ```

### 環境変数の設定 (Environment Variables)

1. `.env.local`ファイルをプロジェクトのルートに作成:
   ```
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Admin Configuration
   NEXT_PUBLIC_ADMIN_EMAIL=admin1@example.com,admin2@example.com
   ```

2. 環境変数の説明:
   - `NEXT_PUBLIC_FIREBASE_*`: Firebase Consoleのプロジェクト設定から取得できる設定値
   - `NEXT_PUBLIC_ADMIN_EMAIL`: 管理者のメールアドレス（複数の場合はカンマ区切り）

### Firebase設定 (Firebase Setup)

1. [Firebase Console](https://console.firebase.google.com/)で新しいプロジェクトを作成
2. 認証機能でメール/パスワード認証とGoogle認証を有効化
3. Firestoreデータベースを作成し、必要なセキュリティルールを設定

### ローカル開発 (Local Development)

```bash
pnpm dev
```

アプリケーションは http://localhost:3000 で実行されます。

## Vercelへのデプロイ (Deployment to Vercel)

1. [Vercel](https://vercel.com)にアカウントを作成し、GitHubリポジトリと連携

2. 新しいプロジェクトを作成:
   - GitHubリポジトリを選択
   - フレームワークプリセットとして`Next.js`を選択

3. 環境変数の設定:
   - Vercelのプロジェクト設定で、`.env.local`と同じ環境変数を設定
   - 本番環境用の値を適切に設定

4. デプロイ:
   - `main`ブランチへのプッシュで自動デプロイ
   - または手動でデプロイを実行

5. デプロイ後の設定:
   - Firebase Consoleで承認済みドメインにVercelのドメインを追加
   - 必要に応じてカスタムドメインを設定

## ライセンス (License)

このプロジェクトはMITライセンスの下で公開されています。

