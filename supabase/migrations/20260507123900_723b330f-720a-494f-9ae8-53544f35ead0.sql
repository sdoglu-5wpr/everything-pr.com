DO $mig$
DECLARE
  v_cat_id  bigint;
  v_pil_id  bigint;
  v_post_id bigint;
  v_media_id bigint;
  v_pillar_html text := $body$<h2>Definition</h2>
<p><strong>Generative Engine Optimization (GEO)</strong> is the practice of structuring content, signals, and online presence so a brand is retrieved, summarized, and cited inside AI-generated answers — including ChatGPT, Claude, Perplexity, Gemini, Microsoft Copilot, and Google AI Overviews.</p>
<p>GEO is not SEO with a new label. SEO competes for a position on a results page. GEO competes for inclusion inside the answer itself.</p>
<hr>
<h2>Where the term came from</h2>
<p>The term was introduced in November 2023 in an academic paper titled "GEO: Generative Engine Optimization" by Pranjal Aggarwal, Vishvak Murahari, Tanmay Rajpurohit, Ashwin Kalyan, Karthik Narasimhan, and Ameet Deshpande, with affiliations across Princeton University, Georgia Tech, the Allen Institute for AI, and IIT Delhi (arXiv:2311.09735).</p>
<p>The paper formalized two ideas the industry had been circling:</p>
<ol>
<li>Generative engines synthesize answers from many sources rather than ranking links.</li>
<li>Content creators can influence whether their material is picked up — but the levers are different from SEO.</li>
</ol>
<p>That paper is the canonical citation. Adjacent terms in the market: <strong>Answer Engine Optimization (AEO)</strong>, <strong>AI SEO</strong>, <strong>AI Optimization (AIO)</strong>, and <strong>LLM Optimization (LLMO)</strong>. They overlap. GEO is the most widely used.</p>
<hr>
<h2>Why GEO matters now</h2>
<p>The behavior shift is already measurable.</p>
<ul>
<li>ChatGPT reached roughly 900 million weekly users by early 2026, up from about 300 million in December 2024.</li>
<li>ChatGPT Search processes an estimated 250 to 500 million weekly queries.</li>
<li>Perplexity handles roughly 50 million weekly queries and is targeting 1 billion weekly by 2027.</li>
<li>Google AI Overviews now appear in approximately 18% of all Google searches and 57% of long-tail queries.</li>
<li>Across all Google searches, around 43% end without a click. With AI Mode active, that figure rises to roughly 93%.</li>
<li>Gartner forecasts overall search query volume will decline 25% by 2026 as answer engines absorb research behavior.</li>
<li>AI referral traffic converts at roughly 14.2% versus 2.8% for traditional organic — fewer visitors, far higher intent.</li>
</ul>
<p>Translation for brands: a smaller share of buyers will reach a website at all. The first impression is being formed inside an AI answer the brand may have no presence in.</p>
<hr>
<h2>GEO vs SEO</h2>
<table>
<thead><tr><th></th><th>SEO</th><th>GEO</th></tr></thead>
<tbody>
<tr><td><strong>Goal</strong></td><td>Rank a URL</td><td>Be cited inside an answer</td></tr>
<tr><td><strong>Surface</strong></td><td>Search results page</td><td>AI-generated response</td></tr>
<tr><td><strong>Unit of competition</strong></td><td>Page</td><td>Sentence, claim, statistic, quote</td></tr>
<tr><td><strong>Signal weight</strong></td><td>Backlinks, keywords, technical SEO</td><td>Semantic clarity, entity authority, citation patterns, structured evidence</td></tr>
<tr><td><strong>Click outcome</strong></td><td>Click through to site</td><td>Often zero-click; brand mention is the win</td></tr>
<tr><td><strong>Measurement</strong></td><td>Rankings, organic traffic, CTR</td><td>Citation share, mention frequency, share of AI voice, sentiment in answers</td></tr>
<tr><td><strong>Refresh velocity</strong></td><td>Slow (months)</td><td>Fast (weeks); models update frequently</td></tr>
</tbody></table>
<p>SEO and GEO are not in conflict. GEO sits on top of SEO. A site that is technically broken, slow, or inaccessible to crawlers will not be retrieved by AI systems either. SEO is the floor. GEO is the ceiling.</p>
<hr>
<h2>How AI retrieval actually works</h2>
<p>A generative engine answers a query in roughly five steps:</p>
<ol>
<li><strong>Query interpretation.</strong> The model parses intent, entities, and context.</li>
<li><strong>Retrieval.</strong> The system pulls candidate sources — from a live web index (Perplexity, ChatGPT Search, Google AI Mode), from the model's training data (base ChatGPT, Claude without browsing), or both. This is where Retrieval-Augmented Generation (RAG) operates.</li>
<li><strong>Ranking and selection.</strong> Candidate passages are scored for relevance, authority, freshness, and consistency with other sources.</li>
<li><strong>Synthesis.</strong> The model composes an answer in natural language, drawing facts from selected passages.</li>
<li><strong>Citation.</strong> Sources are surfaced as inline citations or footnotes — not all sources used, only the ones the model elevates.</li>
</ol>
<p>The brand opportunity sits at steps 2 and 3. If your content is not indexed, structured, and authoritative enough to be selected, the rest does not matter.</p>
<hr>
<h2>The signals that move GEO</h2>
<p>Across the published research and observed citation patterns from BrightEdge, Ahrefs, and Similarweb, the signals that consistently raise AI visibility:</p>
<ul>
<li><strong>Direct, declarative answers.</strong> AI models prefer content that states a claim cleanly in the first sentence of a section.</li>
<li><strong>Structured evidence.</strong> Statistics, dates, named sources, and quotations get pulled disproportionately.</li>
<li><strong>Entity clarity.</strong> Consistent naming, schema markup, and Wikipedia/Wikidata presence reinforce that an entity is "real."</li>
<li><strong>Topical depth.</strong> Sites with comprehensive coverage of a topic outperform sites with one strong page.</li>
<li><strong>Citation footprint.</strong> Being referenced by other authoritative sites (news media, .edu, .gov, Wikipedia, Reddit threads with traction) is a major retrieval signal.</li>
<li><strong>Freshness.</strong> Content updated within the last 90 days is favored for time-sensitive queries.</li>
<li><strong>Format.</strong> FAQ blocks, comparison tables, definition lead-ins, and numbered lists are over-represented in AI citations.</li>
</ul>
<p>Citation concentration is severe. Roughly 40 to 55% of ChatGPT Search and Perplexity citations flow to fewer than 1,000 domains. Reddit, Wikipedia, Stack Overflow, and major news outlets dominate. Breaking into that set is the strategic objective.</p>
<hr>
<h2>Semantic authority</h2>
<p>Search engines reward links. AI systems reward <strong>semantic authority</strong> — the model's internal sense that a brand or domain is the right source for a topic.</p>
<p>Semantic authority is built through:</p>
<ul>
<li>Repeated co-occurrence with topic terms across the open web</li>
<li>Consistent entity attributes (founding date, leadership, location, category) across sources</li>
<li>Structured data that machines can parse without ambiguity</li>
<li>Citations from sources the model already trusts</li>
<li>Knowledge graph presence (Google Knowledge Graph, Wikidata)</li>
</ul>
<p>A brand with strong semantic authority gets cited even when the literal page does not rank. A brand without it disappears from AI answers regardless of SEO performance.</p>
<hr>
<h2>Machine-readable reputation</h2>
<p>Reputation in the AI era is not what people say about you. It is what <em>machines can verify</em> about you.</p>
<p>Three layers:</p>
<ol>
<li><strong>Identity layer.</strong> Schema.org markup, Wikidata, official site, verified social profiles. Tells machines who you are.</li>
<li><strong>Substance layer.</strong> Press coverage, research, executive bylines, third-party data. Tells machines what you do.</li>
<li><strong>Sentiment layer.</strong> Reviews, forum threads, news framing. Tells machines what kind of entity you are — credible, contested, niche, mainstream.</li>
</ol>
<p>A negative or absent layer creates AI risk: the model fills the gap with whatever it can find, including outdated, hostile, or wrong information. Machine-readable reputation is the new corporate reputation.</p>
<hr>
<h2>The AI answer ecosystem</h2>
<p>Six platforms account for the majority of generative engine traffic. Each retrieves differently.</p>
<ul>
<li><strong>ChatGPT and ChatGPT Search.</strong> Largest by volume. Mix of training data and live retrieval via Bing index.</li>
<li><strong>Google AI Overviews and AI Mode.</strong> Embedded inside Google. Pulls from Google's own index and reflects traditional ranking signals heavily.</li>
<li><strong>Perplexity.</strong> Citation-first. Built for research queries. Surfaces sources prominently.</li>
<li><strong>Claude.</strong> Strong on long-form reasoning. Web search added in 2025. Tends to cite high-trust sources.</li>
<li><strong>Microsoft Copilot.</strong> Enterprise distribution through Microsoft 365. Uses Bing index.</li>
<li><strong>Gemini.</strong> Integrated across Google products. Strong in multimodal and personal-context queries.</li>
</ul>
<p>Each platform requires its own visibility tactics. A brand cited heavily in Perplexity may be invisible in ChatGPT. GEO strategy treats them as a portfolio.</p>
<hr>
<h2>Trust signals AI systems read</h2>
<p>AI models infer trust from machine-readable cues:</p>
<ul>
<li>Domain age and history</li>
<li>HTTPS, structured data, accessibility compliance</li>
<li>Author bylines with credentials and external profiles</li>
<li>Date stamps and revision history</li>
<li>Outbound citations to authoritative sources</li>
<li>Inbound citations from authoritative sources</li>
<li>Consistent NAP (name, address, phone) and entity data across the web</li>
<li>Absence of patterns associated with low-quality content (thin pages, AI-generated boilerplate without editorial layer, manipulated review profiles)</li>
</ul>
<p>Trust signals are cumulative. No single fix moves the needle. The brands winning GEO have been compounding these signals for years.</p>
<hr>
<h2>The future of search</h2>
<p>The trajectory is clear:</p>
<ul>
<li>Search query volume falls. Answer query volume rises.</li>
<li>Click-through rates from AI surfaces drop. Brand mentions inside answers become the primary impression.</li>
<li>Citation share replaces ranking position as the core visibility metric.</li>
<li>Traditional SEO consolidates around transactional and navigational queries. Informational SEO migrates entirely to GEO.</li>
<li>Reputation, PR, and content strategy converge. The communications function takes ownership of AI visibility because the levers — earned media, executive thought leadership, authoritative content, entity reinforcement — are PR levers, not search levers.</li>
</ul>
<p>This is why GEO sits inside communications, not inside SEO. The agencies that win this category will be communications firms with technical capability, not technical firms with content output.</p>
<hr>
<h2>How brands actually win at GEO</h2>
<p>A working GEO program runs four workstreams in parallel:</p>
<ol>
<li><strong>Audit and measurement.</strong> Establish a baseline. Track citation share, mention frequency, and sentiment across ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews. Measure weekly.</li>
<li><strong>Content architecture.</strong> Build authoritative cornerstone pages, topic clusters, FAQ schemas, and structured data. Make every page extractable.</li>
<li><strong>Authority building.</strong> Earn citations from the domains AI engines already trust — top-tier press, Wikipedia, research publications, industry reports, podcast appearances with transcripts.</li>
<li><strong>Reputation management.</strong> Monitor what AI engines say about the brand. Correct factual errors. Counter hallucinations. Reinforce entity data.</li>
</ol>
<p>This is a 12 to 24 month compounding program. There is no fast lane. The brands that started in 2024 and 2025 are already pulling away.</p>
<hr>
<h2>Related reading</h2>
<ul>
<li><a href="/geo-vs-seo">GEO vs SEO</a></li>
<li>GEO vs AEO (Answer Engine Optimization)</li>
<li>AI Search Engines Explained</li>
<li>AI Visibility</li>
<li>Semantic Authority</li>
<li>Machine-Readable Reputation</li>
<li>AI Citations</li>
<li>Retrieval-Augmented Generation (RAG)</li>
<li>AI Trust Signals</li>
<li>The Future of GEO</li>
</ul>
<hr>
<h2>About 5W</h2>
<p>5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, and influencer channels. 5W combines public relations, digital marketing, Generative Engine Optimization (GEO), and proprietary AI visibility research, helping clients measure and grow their presence in AI-driven buyer research.</p>
<p>Founded more than 20 years ago, 5W has been recognized as a top U.S. PR agency by O'Dwyer's, named Agency of the Year in the American Business Awards®, and honored as a Top Place to Work in Communications in 2026 by Ragan. 5W serves clients across B2C sectors including Beauty &amp; Fashion, Consumer Brands, Entertainment, Food &amp; Beverage, Health &amp; Wellness, Travel &amp; Hospitality, Technology, and Nonprofit; B2B specialties including Corporate Communications and Reputation Management; as well as Public Affairs, Crisis Communications, and Digital Marketing, including Social Media, Influencer, Paid Media, GEO, and SEO. 5W was also named to the Digiday WorkLife Employer of the Year list.</p>
<p>For more information, visit <a href="http://www.5wpr.com">www.5wpr.com</a>.</p>
$body$;
  v_article_html text := $body$<h2>The short answer</h2>
<p><strong>SEO</strong> competes for a position on a search results page. <strong>GEO</strong> competes for inclusion inside an AI-generated answer.</p>
<p>SEO targets Google, Bing, and traditional search engines. GEO targets ChatGPT, Claude, Perplexity, Gemini, Microsoft Copilot, and Google AI Overviews.</p>
<p>The two disciplines share a foundation — clean technical infrastructure, useful content, authoritative signals — but the unit of competition, the scoring system, and the win condition are different.</p>
<hr>
<h2>Side-by-side</h2>
<table>
<thead><tr><th>Dimension</th><th>SEO</th><th>GEO</th></tr></thead>
<tbody>
<tr><td><strong>Surface</strong></td><td>Google/Bing results page</td><td>ChatGPT, Claude, Perplexity, Gemini, AI Overviews</td></tr>
<tr><td><strong>Goal</strong></td><td>Rank a URL in the top 10</td><td>Be cited inside the answer</td></tr>
<tr><td><strong>Unit of competition</strong></td><td>Page</td><td>Sentence, claim, statistic, quoted line</td></tr>
<tr><td><strong>User behavior</strong></td><td>Click a link</td><td>Read the answer (often zero-click)</td></tr>
<tr><td><strong>Primary signals</strong></td><td>Backlinks, keywords, technical SEO, E-E-A-T</td><td>Semantic clarity, entity authority, citation patterns, structured evidence, freshness</td></tr>
<tr><td><strong>Content format</strong></td><td>Long-form pages optimized for keyword targeting</td><td>Modular, extractable passages with direct answers</td></tr>
<tr><td><strong>Measurement</strong></td><td>Rankings, organic sessions, CTR</td><td>Citation share, mention frequency, share of AI voice, sentiment</td></tr>
<tr><td><strong>Update cycle</strong></td><td>Months</td><td>Weeks — model retraining and live retrieval move fast</td></tr>
<tr><td><strong>Win condition</strong></td><td>First-page ranking</td><td>Brand cited inside the synthesized answer</td></tr>
</tbody></table>
<hr>
<h2>What SEO is</h2>
<p>Search Engine Optimization is the practice of getting a webpage to rank in a list of links on a search engine results page (SERP). The model is mature: keyword research, on-page optimization, technical SEO, link building, and content depth.</p>
<p>The economic logic is click-based. A higher rank produces more clicks, which produces more traffic, which produces more conversions.</p>
<p>That logic is fracturing. Roughly 43% of all Google searches now end without a click. With Google AI Mode active, that figure rises to about 93%. Gartner projects a 25% decline in traditional search query volume by 2026.</p>
<p>SEO is not dead. It is consolidating around transactional and navigational queries — the searches people make when they already know what they want and need to reach it. Informational and research queries are migrating to AI surfaces.</p>
<hr>
<h2>What GEO is</h2>
<p>Generative Engine Optimization is the practice of getting a brand cited inside the answers AI systems generate. The economic logic is mention-based. A brand referenced inside an AI answer is the answer, regardless of whether anyone clicks through.</p>
<p>GEO targets a different decision moment. When a buyer asks ChatGPT "what are the best cybersecurity firms for mid-market SaaS," the brand mentioned in the response is on the shortlist. The brand not mentioned does not exist for that buyer.</p>
<p>The term comes from a November 2023 paper by researchers at Princeton, Georgia Tech, the Allen Institute for AI, and IIT Delhi (Aggarwal et al., arXiv:2311.09735). They formalized the insight that generative engines synthesize answers rather than rank links — and that content creators can influence the synthesis.</p>
<hr>
<h2>Where the disciplines overlap</h2>
<p>The shared foundation is real:</p>
<ul>
<li><strong>Technical hygiene.</strong> A site that crawlers cannot access does not appear in either SEO or GEO. Page speed, mobile readability, schema markup, and accessibility serve both.</li>
<li><strong>Topical depth.</strong> Comprehensive coverage of a topic helps both rankings and AI retrieval.</li>
<li><strong>Backlinks and citations.</strong> AI systems lean heavily on authority signals from the open web. The same press coverage that lifts SEO also feeds AI retrieval.</li>
<li><strong>Freshness.</strong> Both reward updated content for time-sensitive queries.</li>
</ul>
<p>A brand that ignores SEO will not perform in GEO. The technical floor is shared.</p>
<hr>
<h2>Where the disciplines diverge</h2>
<p><strong>Selection logic.</strong> SEO ranks pages against each other. GEO ranks passages against each other. A page can rank #1 in Google and never be cited in ChatGPT if its passages are not extractable.</p>
<p><strong>Format priorities.</strong> SEO rewards long, comprehensive pages. GEO rewards modular, declarative passages that can be lifted intact: a clean definition in the first sentence, a statistic with a source, a numbered list, a comparison table, an FAQ block.</p>
<p><strong>Authority sourcing.</strong> SEO authority comes from a broad backlink profile. GEO authority comes from a narrow set of high-trust sources. BrightEdge and Ahrefs data show that 40 to 55% of ChatGPT Search and Perplexity citations flow to fewer than 1,000 domains — Reddit, Wikipedia, Stack Overflow, and major news outlets dominate.</p>
<p><strong>Entity vs keyword.</strong> SEO is keyword-anchored. GEO is entity-anchored. AI systems care less about the exact phrase and more about whether they can confirm what an entity <em>is</em> — its category, attributes, and relationships. Wikidata presence, schema markup, and consistent third-party references do work that keyword optimization cannot.</p>
<p><strong>Velocity.</strong> SEO updates in months. GEO updates in weeks. Models retrain. Retrieval systems re-index. A brand can move from invisible to cited in 60 to 90 days with the right inputs — or fall out just as quickly if competitors move first.</p>
<hr>
<h2>Measurement</h2>
<p>SEO measurement is mature. Rankings, organic sessions, click-through rate, conversions from organic, share of voice on target keywords. The tooling — Google Search Console, Ahrefs, Semrush, BrightEdge — is established.</p>
<p>GEO measurement is emerging. Core metrics:</p>
<ul>
<li><strong>Citation share.</strong> Of all AI-generated answers in your category, what percentage cite your brand?</li>
<li><strong>Mention frequency.</strong> How often is the brand named even without a citation link?</li>
<li><strong>Share of AI voice.</strong> Brand mentions vs. competitor mentions across a defined query set.</li>
<li><strong>Sentiment.</strong> When mentioned, is the framing positive, neutral, or negative?</li>
<li><strong>Source quality.</strong> Which underlying URLs are AI engines using when they reference the brand?</li>
</ul>
<p>The tooling is consolidating. Profound, Peec AI, Otterly, AthenaHQ, and several incumbent SEO platforms have shipped AI visibility tracking. Methodology varies. Standardized benchmarks are still being established.</p>
<hr>
<h2>The traffic and conversion shift</h2>
<p>Two data points reframe the strategic stakes:</p>
<ul>
<li>AI referral traffic converts at roughly 14.2% versus 2.8% for traditional organic.</li>
<li>Non-branded informational query traffic is down 15 to 30% across content sites since AI Overviews launched.</li>
</ul>
<p>Smaller volume, higher intent. A brand cited in an AI answer reaches a buyer who has already done the research. The traffic is more valuable per session — but only if the brand is in the answer to begin with.</p>
<hr>
<h2>What this means for budget allocation</h2>
<p>The right split depends on the business. A few patterns hold:</p>
<ul>
<li><strong>B2B and considered purchases.</strong> GEO investment should already exceed 30% of search budget. Buyers are doing primary research in AI tools.</li>
<li><strong>E-commerce and transactional.</strong> SEO retains primacy. GEO is supplemental — focus on category and comparison queries that surface in AI Overviews.</li>
<li><strong>Brand and reputation.</strong> GEO is the ceiling for executive and corporate visibility. AI engines now mediate first impressions for journalists, investors, and prospective hires.</li>
<li><strong>Local services.</strong> SEO and GEO are converging fast. AI Overviews now answer most local intent queries.</li>
</ul>
<p>Brands still spending 100% of search budget on SEO are funding the wrong surface for an increasing share of buyer behavior.</p>
<hr>
<h2>What changes for the content team</h2>
<p>Practical shifts when moving from pure SEO to a GEO-aware program:</p>
<ol>
<li><strong>Lead with the answer.</strong> First sentence of every section states the conclusion. The rest supports it.</li>
<li><strong>Cite primary sources inline.</strong> Statistics with attribution get pulled. Statistics without sourcing get ignored.</li>
<li><strong>Build entity infrastructure.</strong> Schema markup, Wikidata entries, consistent NAP, About pages with structured information.</li>
<li><strong>Earn authoritative citations.</strong> Top-tier press, Wikipedia mentions, research reports, podcast transcripts on high-traffic shows.</li>
<li><strong>Maintain a refresh cadence.</strong> Cornerstone pages updated quarterly. Time-sensitive pages monthly.</li>
<li><strong>Modular formatting.</strong> FAQ schemas, comparison tables, numbered lists, definition lead-ins.</li>
<li><strong>Track citation share, not rankings.</strong> Build dashboards for the new metrics.</li>
</ol>
<hr>
<h2>The strategic conclusion</h2>
<p>SEO and GEO are not competing disciplines. They are sequential ones. A brand without SEO discipline cannot win GEO. A brand with only SEO discipline is losing share to brands building both.</p>
<p>The communications function — not the SEO team — owns most of the GEO levers. Earned media, executive visibility, research publishing, entity reinforcement, and reputation management are PR-native skills. The agencies winning this category are communications firms with technical capability, not technical firms with content output.</p>
<hr>
<h2>Related reading</h2>
<ul>
<li><a href="/generative-engine-optimization">What Is GEO (Generative Engine Optimization)?</a></li>
<li>GEO vs AEO (Answer Engine Optimization)</li>
<li>AI Search Engines Explained</li>
<li>AI Visibility</li>
<li>Semantic Authority</li>
<li>AI Citations</li>
<li>The Future of GEO</li>
</ul>
<hr>
<h2>About 5W</h2>
<p>5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, and influencer channels. 5W combines public relations, digital marketing, Generative Engine Optimization (GEO), and proprietary AI visibility research, helping clients measure and grow their presence in AI-driven buyer research.</p>
<p>Founded more than 20 years ago, 5W has been recognized as a top U.S. PR agency by O'Dwyer's, named Agency of the Year in the American Business Awards®, and honored as a Top Place to Work in Communications in 2026 by Ragan. 5W serves clients across B2C sectors including Beauty &amp; Fashion, Consumer Brands, Entertainment, Food &amp; Beverage, Health &amp; Wellness, Travel &amp; Hospitality, Technology, and Nonprofit; B2B specialties including Corporate Communications and Reputation Management; as well as Public Affairs, Crisis Communications, and Digital Marketing, including Social Media, Influencer, Paid Media, GEO, and SEO. 5W was also named to the Digiday WorkLife Employer of the Year list.</p>
<p>For more information, visit <a href="http://www.5wpr.com">www.5wpr.com</a>.</p>
<h2>Frequently asked questions</h2>
<h3>Will SEO disappear?</h3>
<p>No. Transactional and navigational searches still happen on Google and Bing. Volume on those query types remains stable. Informational queries are the segment migrating to AI.</p>
<h3>Should I stop doing SEO?</h3>
<p>No. Cut the parts of SEO that target queries now answered by AI Overviews. Keep the parts that drive transactional traffic. Reallocate the savings to GEO.</p>
<h3>Is GEO just SEO with extra steps?</h3>
<p>No. The selection logic, scoring system, and win condition are different. SEO tactics that worked for years — keyword density, exact-match anchors, mass link building — do not move GEO meaningfully.</p>
<h3>What ranks in AI engines?</h3>
<p>Authority sources cited frequently across the open web. Reddit, Wikipedia, Stack Overflow, major news outlets, and a narrow set of category-defining publications dominate citation share.</p>
<h3>How fast can a brand improve GEO performance?</h3>
<p>Initial citation share movement is typically observable in 60 to 90 days. Meaningful market position changes take 6 to 12 months. Category leadership takes 18 to 36 months.</p>
$body$;
  v_faq jsonb := '[{"q":"Is GEO the same as AEO?","a":"Closely related. AEO (Answer Engine Optimization) generally refers to structured content optimization for any answer surface, including featured snippets and voice assistants. GEO specifically targets generative engines that produce synthesized, conversational responses. In practice the overlap is large."},{"q":"Does GEO replace SEO?","a":"No. SEO remains essential for transactional and navigational queries. GEO addresses the informational and research queries migrating to AI surfaces. Most brands need both."},{"q":"How long does GEO take to show results?","a":"Citation share movement is typically observable within 60 to 90 days of consistent execution. Material market position changes take 6 to 12 months. Category leadership takes 18 to 36 months."},{"q":"Can a brand pay to appear in AI answers?","a":"Not currently in any meaningful way. Some platforms are testing sponsored placements. Organic citation remains the dominant path."},{"q":"What is the single highest-leverage GEO action?","a":"Earning citations from sources AI engines already trust — particularly high-authority press and Wikipedia. Everything else accelerates from there."}]'::jsonb;
  v_schema jsonb := '{"@context":"https://schema.org","@graph":[{"@type":"Article","@id":"https://everything-pr.com/generative-engine-optimization/#article","headline":"Generative Engine Optimization (GEO)","description":"What GEO is, why it matters, and how brands win citations inside AI answers.","url":"https://everything-pr.com/generative-engine-optimization/","image":"https://everything-pr.com/pillars/generative-engine-optimization.webp","datePublished":"2026-05-07","dateModified":"2026-05-07","author":{"@type":"Organization","name":"Everything-PR"},"publisher":{"@id":"https://everything-pr.com/#organization"}},{"@type":"FAQPage","@id":"https://everything-pr.com/generative-engine-optimization/#faq","mainEntity":[{"@type":"Question","name":"Is GEO the same as AEO?","acceptedAnswer":{"@type":"Answer","text":"Closely related. AEO (Answer Engine Optimization) generally refers to structured content optimization for any answer surface, including featured snippets and voice assistants. GEO specifically targets generative engines that produce synthesized, conversational responses. In practice the overlap is large."}},{"@type":"Question","name":"Does GEO replace SEO?","acceptedAnswer":{"@type":"Answer","text":"No. SEO remains essential for transactional and navigational queries. GEO addresses the informational and research queries migrating to AI surfaces. Most brands need both."}},{"@type":"Question","name":"How long does GEO take to show results?","acceptedAnswer":{"@type":"Answer","text":"Citation share movement is typically observable within 60 to 90 days of consistent execution. Material market position changes take 6 to 12 months. Category leadership takes 18 to 36 months."}},{"@type":"Question","name":"Can a brand pay to appear in AI answers?","acceptedAnswer":{"@type":"Answer","text":"Not currently in any meaningful way. Some platforms are testing sponsored placements. Organic citation remains the dominant path."}},{"@type":"Question","name":"What is the single highest-leverage GEO action?","acceptedAnswer":{"@type":"Answer","text":"Earning citations from sources AI engines already trust — particularly high-authority press and Wikipedia. Everything else accelerates from there."}}]}]}'::jsonb;
BEGIN
  -- CATEGORY (slug is unique)
  INSERT INTO categories (id, slug, name, description, seo_title, seo_description)
  VALUES (
    (SELECT COALESCE(MAX(id),0)+1 FROM categories),
    'generative-engine-optimization',
    'Generative Engine Optimization',
    'GEO coverage: how brands earn citations inside ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.',
    'Generative Engine Optimization (GEO)',
    'GEO news, analysis, and strategy for brands competing inside AI-generated answers.'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name=EXCLUDED.name, description=EXCLUDED.description,
    seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description,
    updated_at=now()
  RETURNING id INTO v_cat_id;

  -- PILLAR (slug is unique)
  INSERT INTO pillars (id, slug, title, subtitle, byline, body_html, faq, schema_jsonld, hero_image_url, published)
  VALUES (
    (SELECT COALESCE(MAX(id),0)+1 FROM pillars),
    'generative-engine-optimization',
    'Generative Engine Optimization (GEO)',
    'What GEO is, why it matters, and how brands win citations inside AI answers.',
    'EPR Staff',
    v_pillar_html, v_faq, v_schema,
    '/pillars/generative-engine-optimization.webp',
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, byline=EXCLUDED.byline,
    body_html=EXCLUDED.body_html, faq=EXCLUDED.faq, schema_jsonld=EXCLUDED.schema_jsonld,
    hero_image_url=EXCLUDED.hero_image_url, published=true, updated_at=now()
  RETURNING id INTO v_pil_id;

  -- MEDIA (no unique on url) - manual upsert
  SELECT id INTO v_media_id FROM media WHERE url='/articles/geo-vs-seo.webp' LIMIT 1;
  IF v_media_id IS NULL THEN
    INSERT INTO media (id, url, filename, mime_type, alt_text, title, width, height, uploaded_at)
    VALUES (
      (SELECT COALESCE(MAX(id),0)+1 FROM media),
      '/articles/geo-vs-seo.webp', 'geo-vs-seo.webp', 'image/webp',
      'GEO vs SEO — search results page versus AI-generated answer with inline citations',
      'GEO vs SEO', 1600, 900, now()
    )
    RETURNING id INTO v_media_id;
  ELSE
    UPDATE media SET
      alt_text='GEO vs SEO — search results page versus AI-generated answer with inline citations',
      title='GEO vs SEO', mime_type='image/webp', width=1600, height=900, updated_at=now()
    WHERE id=v_media_id;
  END IF;

  -- POST (unique is (type, slug))
  INSERT INTO posts (id, slug, title, excerpt, content_html, type, status, author_id, featured_media_id, published_at, modified_at)
  VALUES (
    (SELECT COALESCE(MAX(id),0)+1 FROM posts),
    'geo-vs-seo',
    'GEO vs SEO: What''s the Difference?',
    'SEO competes for a position on a search results page. GEO competes for inclusion inside an AI-generated answer. Here is how the two disciplines diverge — and why brands need both.',
    v_article_html,
    'post', 'publish', 6, v_media_id, now(), now()
  )
  ON CONFLICT (type, slug) DO UPDATE SET
    title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content_html=EXCLUDED.content_html,
    author_id=EXCLUDED.author_id, featured_media_id=EXCLUDED.featured_media_id,
    status='publish', modified_at=now(), updated_at=now()
  RETURNING id INTO v_post_id;

  -- LINK
  INSERT INTO post_categories (post_id, category_id)
  VALUES (v_post_id, v_cat_id)
  ON CONFLICT DO NOTHING;
END $mig$;