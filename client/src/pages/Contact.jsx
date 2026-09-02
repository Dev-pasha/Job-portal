import PageShell from '../components/PageShell.jsx';
import { useSite } from '../useSite.js';

export default function Contact() {
  const { siteName, companyName, contactEmail, contactAddress } = useSite();

  return (
    <PageShell
      title="Contact"
      lead="Questions about a role, a listing, or your data. All of it comes to the same inbox."
      page="content"
    >
      {contactEmail ? (
        <>
          <h2>Email</h2>
          <p>
            <a href={`mailto:${contactEmail}`} className="contact-email">
              {contactEmail}
            </a>
          </p>
          <p>
            We aim to reply within two working days. If you are chasing an application, include the
            job title and the email address you applied with, which makes it much quicker to find.
          </p>
        </>
      ) : (
        <div className="notice notice-error">
          No contact email has been set yet. Add one in the admin area under Settings.
        </div>
      )}

      <h2>Employers</h2>
      <p>
        To list a role or advertise on the site, email us with a short description of what you are
        hiring for and where you are based. Listings usually go live the same day.
      </p>

      <h2>Your data</h2>
      <p>
        To see, correct or delete the personal information we hold about you, email the address
        above with the subject line &ldquo;Data request&rdquo;. Use the email address you applied
        with, so we can match it to your application.
      </p>

      {(companyName || contactAddress) && (
        <>
          <h2>Registered details</h2>
          <p className="contact-block">
            {companyName || siteName}
            {contactAddress && (
              <>
                <br />
                {contactAddress}
              </>
            )}
          </p>
        </>
      )}
    </PageShell>
  );
}
