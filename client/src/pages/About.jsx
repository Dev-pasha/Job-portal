import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useSite } from '../useSite.js';

export default function About() {
  const { siteName, contactEmail } = useSite();

  return (
    <PageShell
      title={`About ${siteName}`}
      lead="A small job board built around one idea: an application should reach a person."
      page="content"
    >
      <h2>Why this exists</h2>
      <p>
        Most job boards optimise for volume. Thousands of listings, most of them stale, many of
        them reposted by agencies who never had the role in the first place. You send an
        application into a system that scores it before a human sees it, and then you hear nothing.
      </p>
      <p>
        {siteName} is deliberately smaller. Every role listed here is open at the time you see it,
        and closed listings come off the board rather than lingering to collect applications that
        will never be read.
      </p>

      <h2>How we work</h2>
      <p>
        Applying takes a name, an email and a CV. There is no account to create and no profile to
        maintain, because a profile is work we would be asking you to do for our benefit rather
        than yours.
      </p>
      <p>
        Applications go directly to the team hiring for that role. We do not sell candidate details
        to recruiters, and we do not pass your CV to anyone other than the employer whose role you
        applied for. That is set out properly in our <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>How the site is paid for</h2>
      <p>
        Employers pay to list roles, and some pages carry advertising. Ads are always labelled as
        sponsored so you can tell them apart from real listings, and they never change the order
        that roles appear in. A paid listing is a paid listing; it is not a better match for you
        because of it.
      </p>

      <h2>Talk to us</h2>
      <p>
        We read everything sent to us, including the critical messages.{' '}
        {contactEmail ? (
          <>
            Write to <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or use the{' '}
            <Link to="/contact">contact page</Link>.
          </>
        ) : (
          <>
            The <Link to="/contact">contact page</Link> has the details.
          </>
        )}
      </p>
    </PageShell>
  );
}
