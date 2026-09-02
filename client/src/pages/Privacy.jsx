import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useLegalParty } from '../useSite.js';

export default function Privacy() {
  const { party, contactEmail, contactAddress, policyUpdatedOn } = useLegalParty();

  return (
    <PageShell
      title="Privacy policy"
      lead="What we collect when you apply for a job, why we hold it, and how to get it removed."
      updated={policyUpdatedOn}
    >
      <h2>Who we are</h2>
      <p>
        This site is operated by {party}
        {contactAddress ? `, ${contactAddress}` : ''}. We are responsible for the personal
        information described below.
      </p>
      {contactEmail && (
        <p>
          For anything in this policy, including requests to see or delete your data, contact{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      )}

      <h2>What we collect</h2>
      <p>When you apply for a role, we ask for and store:</p>
      <ul>
        <li>Your name and email address, which are required.</li>
        <li>Your phone number, which is optional.</li>
        <li>Your CV, uploaded as a PDF or Word document.</li>
        <li>Any note you choose to add to your application.</li>
        <li>The date and time you applied, and which role you applied for.</li>
      </ul>
      <p>
        Your CV is a file you wrote, and it may contain far more than the fields above: previous
        employers, education, an address, and sometimes a photograph. We store the file as you
        uploaded it and do not scan, parse or extract data from it.
      </p>
      <p>
        You do not need an account to use this site, so we do not hold passwords or profiles for
        candidates.
      </p>

      <h2>Why we hold it</h2>
      <p>
        To pass your application to the employer whose role you applied for, and to let them
        contact you about it. That is the only purpose. We do not build a candidate database, send
        marketing, or make your details searchable by other employers.
      </p>

      <h2>Who can see it</h2>
      <p>
        Your application and CV are visible to the people who administer this site and to the
        employer hiring for the role you applied for. Uploaded CVs are not published on the web and
        cannot be reached by guessing a link; they are only accessible to a signed-in administrator.
      </p>
      <p>
        We also rely on service providers who necessarily process data on our behalf: our hosting
        provider, which stores the database and uploaded files, and the advertising networks
        described in our <Link to="/cookies">cookie policy</Link>. Advertising networks do not
        receive your application or your CV.
      </p>
      <p>We do not sell your personal information.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep applications while the role is open and for a period afterwards so the employer can
        revisit their shortlist. When a listing is deleted, its applications and the uploaded CV
        files are deleted with it. You can ask us to delete your application sooner at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us to show you the information we hold about you, correct it if it is wrong,
        delete it, or send it to you in a portable form. Depending on where you live, you may also
        have the right to object to certain processing or to complain to a data protection
        authority.
      </p>
      <p>
        Email us using the address you applied with so we can match the request to your
        application. We will not charge you for this.
      </p>

      <h2>Security</h2>
      <p>
        Access to applications requires an administrator sign-in. Uploaded files are stored outside
        the publicly served part of the site. No system is perfectly secure, and we will tell
        affected people if a breach puts their information at risk.
      </p>

      <h2>Children</h2>
      <p>
        This site is intended for people old enough to work legally where they live. We do not
        knowingly collect information from children. If you believe a child has sent us their
        details, contact us and we will remove them.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top of this page. Significant
        changes will be flagged on the site.
      </p>
    </PageShell>
  );
}
