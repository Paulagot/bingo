// src/pages/BlogPost.tsx
import * as React from "react";
import { useParams, Navigate } from "react-router-dom";
import { posts } from "../components/posts/registry";

const Fallback = ({ title = "Loading post..." }: { title?: string }) => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-fg/80">{title}</p>
    </div>
  </div>
);

export default function BlogPost() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/blog" replace />;

  const entry = posts[slug];
  if (!entry) {
    // Unknown slug → 404 page in your router will catch it
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Post not found</h1>
        <p className="text-fg/70">
          We couldn’t find “{slug}”. It might have moved or been unpublished.
        </p>
      </div>
    );
  }

  const PostComponent = React.lazy(entry.loader);

  return (
    <React.Suspense fallback={<Fallback />}>
      <PostComponent />
    </React.Suspense>
  );
}
