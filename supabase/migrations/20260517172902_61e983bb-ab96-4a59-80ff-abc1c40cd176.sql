UPDATE public.authors
SET
  bio = $$<p class="text-lg font-semibold text-foreground">Shaping AI — and the answers inside the chatbox.</p>
<p>Ronn Torossian is the founder and chairman of <strong>5W AI Communications</strong>, launched in 2003 — the AI Communications Firm, combining earned media, digital marketing, Generative Engine Optimization (GEO), and AI-visibility research for B2C and B2B clients across beauty, technology, entertainment, corporate reputation, and crisis communications. An Inc. 500 company, 5W is named <em>Agency of the Year</em> at the American Business Awards and a <em>Top U.S. PR Agency</em> by O'Dwyer's.</p>
<p>A publisher and the author of two best-selling marketing books — <em>For Immediate Release</em> — Torossian has led the communications industry for decades. Now he's building its AI era.</p>
<p>Torossian is the publisher of <strong>Everything-PR</strong> — thirty verticals of original reporting and AI-visibility research, built to be cited by the AI engines — and has guest-lectured on communications and media strategy at Harvard and other universities.</p>
<p>He was a partner and chief marketing officer of <strong>JetSmarter</strong>, the private-aviation unicorn acquired by Vista Global, parent of VistaJet.</p>
<p>More than a third of consumers now begin product research with AI, not Google. Torossian's work is to influence the answer — inside ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews.</p>
<h4>About 5W AI Communications</h4>
<p>5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, and influencer channels. 5W combines public relations, digital marketing, Generative Engine Optimization (GEO), and proprietary AI visibility research to help clients measure and grow their presence in AI-driven buyer research. Founded in 2003, 5W is recognized as a <em>Top U.S. PR Agency</em> by O'Dwyer's, named <em>Agency of the Year</em> in the American Business Awards®, honored as a 2026 <em>Top Place to Work in Communications</em> by Ragan, and named to Digiday's <em>WorkLife Employer of the Year</em> list. 5W serves clients across B2C sectors — Beauty &amp; Fashion, Consumer Brands, Entertainment, Food &amp; Beverage, Health &amp; Wellness, Travel &amp; Hospitality, Technology, and Nonprofit — and B2B specialties including Corporate Communications, Reputation Management, Public Affairs, Crisis Communications, and Digital Marketing across Social, Influencer, Paid Media, GEO, and SEO. Learn more at <a href="https://5wpr.com" target="_blank" rel="noopener">5wpr.com</a>.</p>
<h4>About Everything-PR</h4>
<p>Everything-PR covers communications, reputation, AI visibility, public affairs, media systems, and digital discovery in the answer-engine era. Publishing since 2009. Thirty verticals. Original reporting, research, and analysis. Every page reported, sourced, and built to be cited.</p>$$,
  website = 'https://5wpr.com',
  social = jsonb_build_object(
    'linkedin', 'https://www.linkedin.com/in/ronntorossian',
    'email', 'ronn@5wpr.com',
    'websites', jsonb_build_array(
      jsonb_build_object('label', '5W AI Communications', 'url', 'https://5wpr.com'),
      jsonb_build_object('label', 'Everything-PR', 'url', 'https://everything-pr.com')
    )
  ),
  updated_at = now()
WHERE slug = 'ronn-torossian';