# Jitter Website

A modern, responsive website for the Jitter caffeine tracking app built with clean HTML, CSS, and Jitter's brand colors.

## Features

- **Modern Design**: Clean, professional layout with Jitter's signature purple theme
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices  
- **Navigation**: Bottom tab navigation between Home, Privacy, Terms, and Contact
- **Brand Integration**: Features the Jitter mascot and consistent branding
- **Performance**: Lightweight, fast-loading static site

## File Structure

```
website/
├── index.html          # Main landing page
├── privacy.html        # Privacy policy page
├── terms.html          # Terms of service page  
├── contact.html        # Contact page with form
├── styles.css          # Main stylesheet
├── favicon.ico         # Website favicon
└── purplejittermascot.png  # Jitter mascot image
```

## Local Development

1. Open any HTML file directly in your browser, or
2. Use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

## Deployment Options

### Option 1: Netlify (Recommended - Free)
1. Create account at [netlify.com](https://netlify.com)
2. Drag and drop the `website` folder to Netlify
3. Your site will get a URL like `amazing-site-name.netlify.app`
4. Connect your custom domain in Settings > Domain management

### Option 2: Vercel (Free)
1. Create account at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in the website folder
4. Follow prompts to deploy
5. Add custom domain in project settings

### Option 3: GitHub Pages (Free)
1. Create a GitHub repository
2. Upload website files to the repo
3. Go to Settings > Pages
4. Choose source branch (usually `main`)
5. Add custom domain in Pages settings

### Option 4: Traditional Web Hosting
1. Purchase hosting from providers like:
   - Bluehost, SiteGround, HostGator (shared hosting)
   - DigitalOcean, Linode (VPS)
2. Upload files via FTP/SFTP to the public_html folder
3. Point your domain's DNS to the hosting provider

## Custom Domain Setup

### Step 1: Purchase Domain
- Choose a registrar: Namecheap, GoDaddy, Google Domains, Cloudflare
- Search for available domains (e.g., `jitterapp.com`, `getjitter.com`)
- Purchase the domain

### Step 2: Configure DNS
Add these DNS records (exact values depend on your hosting):

**For Netlify:**
```
Type: CNAME
Name: www
Value: your-site.netlify.app

Type: A  
Name: @
Value: 75.2.60.5
```

**For Vercel:**
```
Type: CNAME
Name: www  
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.19.61
```

**For GitHub Pages:**
```
Type: CNAME
Name: www
Value: yourusername.github.io

Type: A
Name: @
Value: 185.199.108.153
```

### Step 3: SSL Certificate
Most hosting providers (Netlify, Vercel, GitHub Pages) provide free SSL certificates automatically.

## Customization

### Colors
The website uses Jitter's brand colors defined in `styles.css`:
- Primary Background: `#F3ECFF` (soft lavender)
- Card Background: `#E6DBFF` 
- Primary Blue: `#5F70FF`
- Primary Green: `#2FBD60`
- Accent Orange: `#FFD56B`

### Content
- Update contact email in `contact.html` and form action
- Modify pricing in `index.html` if needed
- Update copyright year and company info
- Replace placeholder app store links with real ones

### Images
- Replace `purplejittermascot.png` with updated mascot
- Add app screenshots to the hero section
- Update favicon with final app icon

## Performance Optimizations

- Optimize images before uploading (use WebP format for better compression)
- Minify CSS and HTML for production
- Enable gzip compression on server
- Use a CDN for global distribution

## SEO Considerations

- Each page has proper meta descriptions
- Semantic HTML structure
- Alt text on all images
- Proper heading hierarchy (H1, H2, H3)
- Fast loading times
- Mobile responsive design

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contact

For questions about the website, contact: thejitterapp@gmail.com 