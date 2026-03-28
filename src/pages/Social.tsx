import { useEffect, useState } from 'react';
import { getSocialPosts, type SocialPost } from '../api';
import { ExternalLink, Instagram, Youtube, Twitter, Facebook } from 'lucide-react';

const PLATFORM_CONFIG: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram', color: '#E1306C', Icon: Instagram },
  youtube:   { label: 'YouTube',   color: '#FF0000', Icon: Youtube },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2', Icon: Twitter },
  facebook:  { label: 'Facebook',  color: '#1877F2', Icon: Facebook },
  tiktok:    { label: 'TikTok',    color: '#000000', Icon: ExternalLink },
};

function getPlatformConfig(platform: string) {
  return PLATFORM_CONFIG[platform.toLowerCase()] ?? { label: platform, color: '#666', Icon: ExternalLink };
}

export default function Social() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSocialPosts()
      .then(setPosts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Social</h1>
      <p className="text-gray-500 mb-8">Follow along and stay connected with us.</p>

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <ExternalLink className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No posts yet.</p>
          <p className="text-sm mt-1">Check back soon.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => {
          const cfg = getPlatformConfig(post.platform);
          const { Icon } = cfg;
          return (
            <a
              key={post.id}
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-3 border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white"
                  style={{ backgroundColor: cfg.color }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
              </div>

              {post.title && (
                <p className="text-sm text-gray-600 line-clamp-3">{post.title}</p>
              )}

              <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 mt-auto">
                <ExternalLink className="w-3 h-3" />
                <span>View post</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
