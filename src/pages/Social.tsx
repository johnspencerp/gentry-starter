import { useEffect, useRef, useState } from 'react';
import { getSocialPosts, type SocialPost } from '../api';
import { ExternalLink } from 'lucide-react';

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function getInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getTiktokVideoId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

function YoutubeEmbed({ videoId, title, postUrl }: { videoId: string; title?: string | null; postUrl: string }) {
  return (
    <div className="w-full">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title ?? 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {title && <p className="text-sm font-medium mt-2">{title}</p>}
    </div>
  );
}

function InstagramEmbed({ permalink, title }: { permalink: string; title?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = window as any;
    if (win.instgrm?.Embeds) {
      win.instgrm.Embeds.process();
    } else if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, [permalink]);

  return (
    <div ref={ref} className="w-full max-w-sm mx-auto">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{ background: '#FFF', border: 0, borderRadius: 3, boxShadow: '0 0 1px 0 rgba(0,0,0,.5),0 1px 10px 0 rgba(0,0,0,.15)', margin: '0 auto', maxWidth: 400, minWidth: 280, padding: 0, width: '100%' }}
      >
        <a href={permalink} target="_blank" rel="noopener noreferrer" className="block p-4 text-center text-sm text-blue-600">
          View this post on Instagram
        </a>
      </blockquote>
      {title && <p className="text-sm font-medium mt-2 text-center">{title}</p>}
    </div>
  );
}

function TikTokEmbed({ videoId, postUrl, title }: { videoId: string; postUrl: string; title?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = window as any;
    if (win.tiktokEmbed?.lib) {
      win.tiktokEmbed.lib.render();
    } else if (!document.querySelector('script[src*="tiktok.com/embed.js"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.tiktok.com/embed.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, [videoId]);

  return (
    <div ref={ref} className="w-full max-w-sm mx-auto">
      <blockquote
        className="tiktok-embed"
        cite={postUrl}
        data-video-id={videoId}
        style={{ maxWidth: 325, minWidth: 280 }}
      >
        <section>
          <a href={postUrl} target="_blank" rel="noopener noreferrer" className="block p-4 text-center text-sm">
            View on TikTok
          </a>
        </section>
      </blockquote>
      {title && <p className="text-sm font-medium mt-2 text-center">{title}</p>}
    </div>
  );
}

function LinkCard({ post, platformLabel, platformColor }: { post: SocialPost; platformLabel: string; platformColor: string }) {
  return (
    <a
      href={post.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 border rounded-xl p-4 bg-white hover:shadow-md transition-shadow group"
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: platformColor }}
      >
        {platformLabel.charAt(0).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{platformLabel}</p>
        {post.title && <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{post.title}</p>}
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 mt-1">
          <ExternalLink className="w-3 h-3" /> View post
        </span>
      </div>
    </a>
  );
}

function PostEmbed({ post }: { post: SocialPost }) {
  const platform = post.platform.toLowerCase();

  if (platform === 'youtube') {
    const videoId = getYoutubeVideoId(post.postUrl);
    if (videoId) return <YoutubeEmbed videoId={videoId} title={post.title} postUrl={post.postUrl} />;
  }

  if (platform === 'instagram') {
    const postId = getInstagramPostId(post.postUrl);
    if (postId) return <InstagramEmbed permalink={post.postUrl} title={post.title} />;
  }

  if (platform === 'tiktok') {
    const videoId = getTiktokVideoId(post.postUrl);
    if (videoId) return <TikTokEmbed videoId={videoId} postUrl={post.postUrl} title={post.title} />;
  }

  const PLATFORM_COLORS: Record<string, string> = {
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    x: '#000000',
    pinterest: '#E60023',
  };

  return (
    <LinkCard
      post={post}
      platformLabel={post.platform}
      platformColor={PLATFORM_COLORS[platform] ?? '#666'}
    />
  );
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

  const youtubePosts = posts.filter(p => p.platform.toLowerCase() === 'youtube');
  const instagramPosts = posts.filter(p => p.platform.toLowerCase() === 'instagram');
  const tiktokPosts = posts.filter(p => p.platform.toLowerCase() === 'tiktok');
  const otherPosts = posts.filter(p => !['youtube', 'instagram', 'tiktok'].includes(p.platform.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Stay Connected</p>
      <h1 className="text-3xl font-bold mb-2">Social</h1>
      <p className="text-gray-500 mb-10">Follow along and stay connected with us.</p>

      {loading && <div className="text-center py-20 text-gray-400">Loading…</div>}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <ExternalLink className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No posts yet.</p>
          <p className="text-sm mt-1">Check back soon.</p>
        </div>
      )}

      {youtubePosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">YouTube</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {youtubePosts.map(p => <PostEmbed key={p.id} post={p} />)}
          </div>
        </section>
      )}

      {instagramPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Instagram</h2>
          <div className="flex flex-wrap gap-4 justify-start">
            {instagramPosts.map(p => <PostEmbed key={p.id} post={p} />)}
          </div>
        </section>
      )}

      {tiktokPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">TikTok</h2>
          <div className="flex flex-wrap gap-4 justify-start">
            {tiktokPosts.map(p => <PostEmbed key={p.id} post={p} />)}
          </div>
        </section>
      )}

      {otherPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">More</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherPosts.map(p => <PostEmbed key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
