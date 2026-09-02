import Masthead from './Masthead.jsx';
import AdSlot, { PageAds } from './AdSlot.jsx';

/**
 * Layout for the written pages: about, contact and the legal ones.
 *
 * `page` decides which ads may appear. The legal pages pass no page at all, so
 * they carry no advertising: they are what someone reads while deciding whether
 * to trust you with their CV.
 */
export default function PageShell({ title, lead, updated, page, children }) {
  const body = (
    <>
      <Masthead />
      <main className="shell page">
        {page && <AdSlot slot="top" />}
        <header className="page-head">
          <h1>{title}</h1>
          {lead && <p className="page-lead">{lead}</p>}
          {updated && <p className="page-updated">Last updated {updated}</p>}
        </header>
        <div className="prose-page">{children}</div>
        {page && <AdSlot slot="bottom" />}
      </main>
    </>
  );

  return page ? <PageAds page={page}>{body}</PageAds> : body;
}
