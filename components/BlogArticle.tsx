import Link from "next/link";
import { ArrowLeft, ChevronLeft, Lightbulb } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { relatedPosts } from "@/lib/blogPosts";
import type { BlogBlock, BlogPost } from "@/lib/blogPosts";
import { BlogPostCard } from "./BlogPostCard";
import { BlogProgress } from "./BlogProgress";
import { BlogShare } from "./BlogShare";
import { BlogToc } from "./BlogToc";
import { blogDate } from "./blogFormat";
import "./blog.css";

/**
 * رندر یک مقاله (کامپوننت سرور؛ فقط نوار پیشرفت، اشتراک و فهرست مطالب
 * کلاینت‌اند). بلاک‌ها عمدا داده‌اند نه HTML خام: هم `dangerouslySetInnerHTML`
 * لازم نمی‌شود، هم سلسله‌مراتب تیترها (یک H1، بعد H2/H3) ساختاری می‌ماند.
 */
function renderBlock(b: BlogBlock, i: number, h2Id?: string) {
  switch (b.type) {
    case "h2":
      return <h2 key={i} id={h2Id}>{b.text}</h2>;
    case "h3":
      return <h3 key={i}>{b.text}</h3>;
    case "ul":
      return (
        <ul key={i}>
          {b.items.map((it, j) => <li key={j}>{it}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol key={i}>
          {b.items.map((it, j) => <li key={j}>{it}</li>)}
        </ol>
      );
    case "tip":
      return (
        <aside key={i} className="blog-tip">
          <Lightbulb size={18} aria-hidden="true" />
          <div>
            {b.title && <strong>{b.title}</strong>}
            <p>{b.text}</p>
          </div>
        </aside>
      );
    case "table":
      return (
        <div key={i} className="blog-table-wrap" tabIndex={0}>
          <table>
            <thead>
              <tr>{b.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "cta":
      return (
        <Link key={i} href={b.href} className="blog-inline-cta">
          <span>
            <span className="blog-inline-cta-text">{b.text}</span>
            <strong>{b.label}</strong>
          </span>
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      );
    default:
      return <p key={i}>{b.text}</p>;
  }
}

export function BlogArticle({ post }: { post: BlogPost }) {
  const cat = BLOG_CATEGORIES[post.category];
  // شناسه‌ی لنگر هر H2 به ترتیب: s-1، s-2، ...
  const toc: { id: string; text: string }[] = [];
  const ids = new Map<number, string>();
  post.blocks.forEach((b, i) => {
    if (b.type === "h2") {
      const id = `s-${toc.length + 1}`;
      toc.push({ id, text: b.text });
      ids.set(i, id);
    }
  });
  const related = relatedPosts(post, 3);
  const modified = post.updated && post.updated !== post.published ? post.updated : undefined;

  return (
    <main className="blog-root blog-post">
      <BlogProgress />
      <nav aria-label="مسیر صفحه" className="blog-crumb">
        <Link href="/">آریون</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <Link href="/blog">مقاله‌ها</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <Link href={`/blog/category/${post.category}`}>{cat.label}</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <span aria-current="page" className="blog-crumb-cur">{post.title}</span>
      </nav>

      <div className="blog-layout">
        <header className="blog-head">
          <Link href={`/blog/category/${post.category}`} className="blog-cat">{cat.label}</Link>
          <h1>{post.title}</h1>
          <div className="blog-meta">
            <span>تیم آریون</span>
            <span aria-hidden="true">·</span>
            <span>
              انتشار <time dateTime={post.published}>{blogDate(post.published)}</time>
            </span>
            {modified && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  به‌روزرسانی <time dateTime={modified}>{blogDate(modified)}</time>
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} دقیقه مطالعه</span>
          </div>
        </header>

        <BlogToc items={toc} />

        <article className="blog-body" id="blog-article-body">
          {post.takeaways && post.takeaways.length > 0 && (
            <section className="blog-takeaways" aria-label="خلاصه در یک نگاه">
              <div className="blog-takeaways-title">خلاصه در یک نگاه</div>
              <ul>
                {post.takeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
          )}

          <div className="blog-prose">{post.blocks.map((b, i) => renderBlock(b, i, ids.get(i)))}</div>

          {post.faq && post.faq.length > 0 && (
            <section className="blog-faq">
              <h2>پرسش‌های پرتکرار</h2>
              {post.faq.map((f, i) => (
                <details key={i}>
                  <summary><h3>{f.q}</h3></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          )}

          <BlogShare title={post.title} />
        </article>
      </div>

      <section className="blog-more">
        <h2>ادامه‌ی مطلب</h2>
        <div className="blog-grid">
          {related.map((p) => <BlogPostCard key={p.slug} post={p} />)}
        </div>
        <ul className="blog-links">
          {post.related.map((r) => (
            <li key={r.href}><Link href={r.href}>{r.label}</Link></li>
          ))}
          <li><Link href="/blog">همه‌ی مقاله‌های آریون</Link></li>
        </ul>

        <div className="blog-signup">
          <p>روتین، خواب، تمرین و ژورنال ترید در یک اپ.</p>
          <Link href="/auth/signup" className="blog-btn">
            امتحان رایگان 14 روزه <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
