import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useLegalParty } from '../useSite.js';

export default function Cookies() {
  const { contactEmail, policyUpdatedOn } = useLegalParty();

  return (
    <PageShell
      title="Cookie policy"
      lead="What gets stored in your browser, by us and by the advertising networks we use."
      updated={policyUpdatedOn}
    >
      <h2>What we store ourselves</h2>
      <p>
        Browsing roles and applying for them does not require any cookie. We do not use analytics
        or tracking cookies of our own.
      </p>
      <p>
        The one thing we do store is a sign-in token, and only for administrators. It is kept in
        your browser&rsquo;s session storage, not in a cookie, and it is discarded when you close
        the tab. If you never sign in to the admin area, nothing is stored.
      </p>

      <h2>Advertising</h2>
      <p>
        Some pages carry advertising served by third-party networks. When an ad loads, that network
        may set cookies or similar identifiers in your browser, and may collect information such as
        your IP address, approximate location, device and browser, and the pages you saw the ad on.
        They use this to choose which ads to show and to measure how they perform.
      </p>
      <p>
        This happens under the advertising network&rsquo;s own privacy policy rather than ours, and
        we do not control what they collect. Advertising networks never receive your application or
        your CV.
      </p>
      <p>
        Ads on this site are always labelled as sponsored, and they never affect which roles are
        shown to you or the order they appear in.
      </p>

      <h2>Turning them off</h2>
      <p>
        Every major browser lets you block or delete cookies, usually under privacy settings. You
        can block third-party cookies specifically, which stops advertising cookies while leaving
        the site working normally. Ad blockers also prevent these networks from loading at all, and
        we do not detect or discourage them.
      </p>
      <p>Blocking cookies will not stop you browsing roles or applying for them.</p>

      <h2>More</h2>
      <p>
        How we handle your application and your CV is covered in the{' '}
        <Link to="/privacy">privacy policy</Link>.
        {contactEmail && (
          <>
            {' '}
            Questions go to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </>
        )}
      </p>
    </PageShell>
  );
}
