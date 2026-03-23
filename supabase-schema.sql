-- ============================================================
-- 在 Supabase SQL Editor 中执行此文件
-- Dashboard → SQL Editor → New query → 粘贴 → Run
-- ============================================================

-- 1. 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    TEXT        NOT NULL,
  author     TEXT        NOT NULL,
  avatar_url TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  likes      INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 索引：按文章查询评论（最常见的查询）
CREATE INDEX IF NOT EXISTS idx_comments_post_id
  ON comments (post_id, created_at ASC);

-- 3. Row Level Security（RLS）
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 任何人都可以读取评论
CREATE POLICY "comments_select_public"
  ON comments FOR SELECT
  USING (true);

-- 任何人都可以发表评论（匿名用户）
CREATE POLICY "comments_insert_public"
  ON comments FOR INSERT
  WITH CHECK (
    length(trim(author))  BETWEEN 1 AND 50 AND
    length(trim(content)) BETWEEN 1 AND 2000
  );

-- 任何人都可以点赞（只允许 likes 字段 +1，防止乱改）
CREATE POLICY "comments_update_likes"
  ON comments FOR UPDATE
  USING (true)
  WITH CHECK (likes = (SELECT likes FROM comments WHERE id = comments.id) + 1);

-- 4. 开启实时订阅（Realtime）
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
