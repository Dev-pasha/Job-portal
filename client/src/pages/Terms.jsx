import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { useLegalParty } from '../useSite.js';

export default function Terms() {
  const { party, contactEmail, policyUpdatedOn } = useLegalParty();

  return (
    <PageShell
      title="Terms of use"
      lead="The basics of using this site, for candidates and for employers."
      updated={policyUpdatedOn}
    >
      <h2>Using the site</h2>
      <p>
        By browsing this site or applying for a role you agree to these terms. The site is operated
        by {party}. If you do not agree with them, please do not use the site.
      </p>

      <h2>For candidates</h2>
      <p>
        Applying is free. You agree that the information you submit is truthful and yours to share,
        and that your CV does not contain material you are not entitled to distribute, such as a
        previous employer&rsquo;s confidential information.
      </p>
      <p>
        We pass your application to the employer, but we cannot promise a reply, an interview, or
        that any role will be filled. Hiring decisions are made by the employer, not by us.
      </p>
      <p>
        Listings are provided by employers. We remove ones we find to be misleading, but we cannot
        verify every detail of every role, and we are not a party to any employment relationship
        that follows.
      </p>

      <h2>For employers</h2>
      <p>
        You are responsible for the accuracy of what you post, and for it being lawful where the
        role is based, including equal opportunity and pay transparency requirements. Do not post
        roles that do not exist, or ask candidates for payment.
      </p>
      <p>
        Applications and CVs you receive may only be used to consider that candidate for the role
        they applied to. You may not add them to a database for other purposes, sell them, or pass
        them to a third party. You are responsible for handling them in line with the data
        protection law that applies to you.
      </p>
      <p>
        We may remove any listing and suspend any account, at our discretion, where these terms are
        not being followed.
      </p>

      <h2>What you may not do</h2>
      <ul>
        <li>Scrape, harvest or bulk-download listings or candidate details.</li>
        <li>Submit applications automatically, or apply as somebody other than yourself.</li>
        <li>Upload malware, or files designed to interfere with the site.</li>
        <li>Attempt to gain access to the administration area or to other people&rsquo;s data.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        We try to keep the site running, but it is provided as it is. We do not guarantee
        uninterrupted access, and we may change or withdraw features. To the extent the law allows,
        we are not liable for losses arising from your use of the site, including a missed
        application or a role that was filled before you applied.
      </p>

      <h2>Advertising</h2>
      <p>
        Some pages carry advertising from third parties. An ad appearing here is not a
        recommendation, and we are not responsible for what advertisers offer or for the sites they
        link to. See the <Link to="/cookies">cookie policy</Link> for what advertising networks
        collect.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms, and the date at the top of this page will change when we do.
        Continuing to use the site means you accept the current version.
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
