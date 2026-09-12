import { useEffect } from 'react'

/**
 * Visible FAQ block. Optionally inject matching FAQPage JSON-LD
 * (schema must mirror on-page text; avoid duplicating sitewide FAQ already in index.html).
 */
export default function FaqSection({
  title = 'Frequently asked questions',
  subtitle,
  faqs = [],
  schemaId = 'https://floodassist-assam.vercel.app/#faq-page',
  injectSchema = true,
}) {
  useEffect(() => {
    if (!injectSchema || !faqs.length) return undefined
    const scriptId = `faq-jsonld-${schemaId.replace(/[^a-z0-9]+/gi, '-')}`
    let el = document.getElementById(scriptId)
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = scriptId
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': schemaId,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    })
    return () => {
      el?.remove()
    }
  }, [faqs, schemaId, injectSchema])

  if (!faqs.length) return null

  return (
    <section
      className="mx-auto max-w-3xl"
      aria-labelledby="faq-heading"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <h2
        id="faq-heading"
        className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {subtitle}
        </p>
      ) : null}
      <dl className="mt-6 space-y-4">
        {faqs.map((f) => (
          <div
            key={f.question}
            className="rounded-2xl border border-border bg-white p-5 dark:border-border-dark dark:bg-surface-dark-muted"
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <dt
              className="text-base font-bold text-slate-900 dark:text-white"
              itemProp="name"
            >
              {f.question}
            </dt>
            <dd
              className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <span itemProp="text">{f.answer}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
