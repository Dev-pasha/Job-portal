# Deploying on Ubuntu

A complete walkthrough for putting this on an Ubuntu 22.04 or 24.04 server, with
nginx in front, PostgreSQL locally, and HTTPS.

Everything here has been tested end to end: nginx serving the built front end,
proxying the API, serving ad banners, refusing to serve CVs, and accepting a 4 MB
upload.

**Before you start you need:** a server with root or sudo access and about 30
minutes. A 1 GB droplet is enough for a board with a few thousand listings.

A domain name is not required to get running. If you do not have one yet, follow
the same steps but read **[No domain yet](#no-domain-yet)** first: it changes two
steps and skips one. Get a domain before you accept real applications, for the
reason explained there.

---

## 1. Install what the server needs

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
```

Node.js 22 from NodeSource, because Ubuntu's own package is usually too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v22.x
```

## 2. Create the database

```bash
sudo -u postgres psql
```

Inside psql, using a password of your own:

```sql
CREATE USER jobportal WITH PASSWORD 'a-long-random-password-here';
CREATE DATABASE jobportal OWNER jobportal;
\q
```

Postgres listens only on localhost by default, which is what you want. Nothing
outside the server should reach the database.

## 3. Create a user to run the app

Running a web app as root means a bug in it is a bug with root privileges.

```bash
sudo useradd --system --create-home --home-dir /opt/job-portal --shell /bin/bash jobportal
```

## 4. Put the code on the server

```bash
sudo -u jobportal git clone YOUR_REPO_URL /opt/job-portal
```

Or, if you are copying the zip up from your machine:

```bash
scp job-portal.zip you@your-server:/tmp/
sudo unzip /tmp/job-portal.zip -d /opt/
sudo mv /opt/job-portal /opt/job-portal
sudo chown -R jobportal:jobportal /opt/job-portal
```

## 5. Configure the app

```bash
sudo -u jobportal cp /opt/job-portal/server/.env.example /opt/job-portal/server/.env
sudo -u jobportal nano /opt/job-portal/server/.env
```

Generate a real signing secret first:

```bash
openssl rand -base64 48
```

Then set:

```ini
PORT=4000
CLIENT_ORIGIN=https://example.com
DATABASE_URL=postgresql://jobportal:a-long-random-password-here@localhost:5432/jobportal
PGSSL=false
JWT_SECRET=paste-the-openssl-output-here
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-strong-password-you-choose
```

`PGSSL=false` is correct here because the database is on the same machine. Set it
to `true` only for a hosted database reached over the network.

Lock the file down, since it holds two passwords and the signing secret:

```bash
sudo chmod 600 /opt/job-portal/server/.env
sudo chown jobportal:jobportal /opt/job-portal/server/.env
```

## 6. Install, build and seed

```bash
cd /opt/job-portal/server
sudo -u jobportal npm ci --omit=dev
sudo -u jobportal npm run seed        # creates the tables and your admin account

cd /opt/job-portal/client
sudo -u jobportal npm ci
sudo -u jobportal npm run build       # writes client/dist
```

`npm run seed` is safe to re-run. It creates tables only if they are missing and
resets the admin password to whatever is in `.env`.

Once it has run, remove `ADMIN_PASSWORD` from `.env` or change it, so your
password is not sitting in a file on disk.

## 7. Run the API as a service

```bash
sudo cp /opt/job-portal/deploy/job-portal-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now job-portal-api
sudo systemctl status job-portal-api
```

The unit restarts the API if it crashes and starts it again after a reboot. It
also confines the process: the only directory it can write to is
`server/data`, where uploads live.

Check it came up:

```bash
curl localhost:4000/api/health     # {"ok":true}
journalctl -u job-portal-api -n 30
```

## 8. Put nginx in front

```bash
sudo cp /opt/job-portal/deploy/nginx.conf /etc/nginx/sites-available/job-portal
sudo nano /etc/nginx/sites-available/job-portal   # replace example.com with your domain
sudo ln -s /etc/nginx/sites-available/job-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Nginx now serves the built front end, proxies `/api` to the Node service, and
serves ad banners straight from disk.

Two lines in that config matter more than they look:

**`client_max_body_size 12M`.** Nginx defaults to 1 MB and rejects anything
larger before the API ever sees it. Without this line, a 4 MB CV fails with a
bare 413 that the application cannot explain to the candidate, and the API logs
show nothing at all. This is the single most common thing to get wrong here.

**`try_files $uri $uri/ /index.html`.** The front end is a single-page app. Without
this, someone refreshing `/privacy` or opening a shared link to `/jobs/12` gets a
404 from nginx, because no such file exists on disk.

Note also what is *absent*: `server/data/uploads`, where CVs live, is never
served by nginx. Only `ad-images` is. That separation is what keeps CVs
reachable solely through the authenticated API route, so keep it if you edit this
file.

## 9. Turn on HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot edits the nginx config for you, adding the certificate and a redirect
from port 80. Renewal is automatic; check it works with:

```bash
sudo certbot renew --dry-run
```

Do not skip this. Admin sign-ins and CV uploads both travel over this connection.

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Port 4000 stays closed. The API is reached only through nginx on the same
machine, so it never needs to be exposed.

## 11. Finish setting the site up

Visit `https://example.com/admin` and sign in.

1. **Settings** — fill in your site name, legal company name, contact email and
   address. The footer and the privacy, cookie and terms pages all read from
   here, and until they are set the legal pages have no responsible party to
   name.
2. **Listings** — post a role, or import a spreadsheet of them.
3. **Ads** — if you are running a network, paste your ad code and put your
   publisher line in `client/public/ads.txt`, then rebuild the front end so it
   reaches `https://example.com/ads.txt`.

---

## No domain yet

You can run the whole thing on the droplet's IP address, for example
`http://203.0.113.10`. Everything works: all the pages, the admin area,
applications and uploads. Three changes:

**In step 5**, set the origin to the IP rather than a domain:

```ini
CLIENT_ORIGIN=http://YOUR_DROPLET_IP
```

**In step 8**, use the no-domain config, which needs no editing:

```bash
sudo cp /opt/job-portal/deploy/nginx-no-domain.conf /etc/nginx/sites-available/job-portal
sudo ln -s /etc/nginx/sites-available/job-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

It sets `server_name _`, which matches any hostname, so the site answers on the
bare IP.

**Skip step 9 entirely.** Let's Encrypt does not issue certificates for IP
addresses, so there is no HTTPS to set up.

### What you give up until you have a domain

**No HTTPS, which is the one that matters.** Your admin password is sent in
plain text every time you sign in, and so is every CV a candidate uploads. On
shared or mobile networks that traffic can be read. Use the IP setup to get the
site running, configure it and test it. Do not advertise it to real candidates
and do not collect real CVs over it.

**No ad network.** Adsterra and every comparable network need a real domain to
approve a site, and `ads.txt` has to live at a domain root. Ads will not work
from an IP address, so leave that step until later.

**Poor search visibility.** Search engines effectively will not rank a bare IP,
and no one will link to one.

### Switching to a domain later

It is a five-minute job, and nothing in the database changes.

1. Buy the domain. Namecheap, Porkbun and Cloudflare are all around $10 a year.
   You can also let DigitalOcean host the DNS from your droplet's Networking tab.
2. Add an `A` record pointing at your droplet's IP, and a second one for `www`.
   Wait for it to resolve: `dig +short example.com`.
3. Swap the config and turn on HTTPS:

```bash
sudo cp /opt/job-portal/deploy/nginx.conf /etc/nginx/sites-available/job-portal
sudo nano /etc/nginx/sites-available/job-portal    # replace example.com
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

4. Update `CLIENT_ORIGIN` in `server/.env` to `https://example.com` and restart:
   `sudo systemctl restart job-portal-api`.

If you want HTTPS before buying anything, a free subdomain from
[duckdns.org](https://www.duckdns.org) works with certbot and gives you real
encryption. It looks like `yourname.duckdns.org`, which is fine while testing but
not what you want on a job board candidates are meant to trust.

---

## Backups

```bash
sudo mkdir -p /var/backups/job-portal
sudo chown jobportal:jobportal /var/backups/job-portal
sudo -u jobportal crontab -e
```

Add:

```
0 3 * * * /opt/job-portal/deploy/backup.sh >> /var/log/job-portal-backup.log 2>&1
```

The script dumps the database and tars the uploaded files, keeping 30 days.

**Both halves matter.** A database dump contains the application rows but not the
CV files; the files on their own have no applications attached. Restoring one
without the other gives you a broken site, so back up both or neither.

Copy the backups off the server. A backup that lives only on the machine it is
protecting is not a backup. And restore one into a scratch database at least once
before you need to.

## Updating after a code change

```bash
cd /opt/job-portal
sudo -u jobportal git pull
sudo -u jobportal ./deploy/deploy.sh
```

The script installs dependencies, applies any schema migrations, rebuilds the
front end, restarts the API and reloads nginx. Migrations are written to be safe
to run twice, so a repeated deploy does no harm.

Take a backup before deploying anything that changes the schema.

---

## When something is wrong

**Start here.** These two commands answer most questions:

```bash
sudo systemctl status job-portal-api
sudo journalctl -u job-portal-api -n 50 --no-pager
```

**502 Bad Gateway** — nginx is up but the API is not. Check the service status
above. The usual cause is a database connection problem, and the API says so on
startup rather than failing silently.

**413 on an upload** — `client_max_body_size` in the nginx config, as described in
step 8.

**A page 404s on refresh but works when clicked** — the `try_files` line is
missing or the `root` path is wrong.

**Database connection refused** — check `sudo systemctl status postgresql` and
confirm the password in `DATABASE_URL` matches the one you set in step 2.

**Ad banners 404** — the `alias` in the nginx config must point at
`/opt/job-portal/server/data/ad-images/`, with the trailing slash.

**Front end changed but the browser shows the old version** — `index.html` is
served with `no-cache` and assets have hashed filenames, so a hard refresh
should be enough. If not, confirm `npm run build` actually ran and wrote to
`client/dist`.

**nginx will not start, complaining about `[::]:80`** — that machine has no IPv6.
Delete the `listen [::]:80;` line.

## Making it a bit tougher

None of this is required to go live, but all of it is worth doing once you have
real applications in the database:

- **`fail2ban`** to slow down SSH brute force. The API already rate-limits
  sign-ins to 10 attempts per 15 minutes and applications to 20 per hour.
- **SSH keys only**, with password authentication disabled.
- **Unattended security upgrades**: `sudo apt install unattended-upgrades`.
- **Move uploads to S3 or similar** if you outgrow one server, or if you move to
  a host with an ephemeral filesystem, where uploaded files disappear on
  restart. The database would survive and the CVs would not.
