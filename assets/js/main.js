// Initialize PDF.js worker before Vue app creation
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const { createApp, ref, computed, onMounted } = Vue;
    
    createApp({
      setup() {
        // Refs
        const fileInput = ref(null);
        const isLoading = ref(false);
        const showResults = ref(false);
        const showScrollToTop = ref(false);
          
        // Data
        const overallScore = ref(0);
        const atsScore = ref(0);
        const readabilityScore = ref(0);
        const impactScore = ref(0);
        const scoreFeedback = ref('Upload your CV to begin analysis');
        const contentIssues = ref([]);
        const formatIssues = ref([]);
        const readabilityIssues = ref([]);
        const quickFixes = ref([]);
        const strengths = ref([]);
        const improvements = ref([]);
        const keywordAnalysis = ref([]);
        const missingKeywords = ref([]);
        const optimizationTips = ref([
          "Start each bullet point with a strong action verb (Managed, Led, Developed)",
          "Include quantifiable achievements (numbers, percentages, timeframes)",
          "Keep your CV to 2 pages maximum (1 page for <5 years experience)",
          "Use consistent formatting (same fonts, sizes, spacing throughout)",
          "Tailor your CV for each job application (match keywords from job description)",
          "Focus on achievements rather than responsibilities (show impact)",
          "Use standard section headings (Experience, Education, Skills, Projects)",
          "Avoid personal pronouns (I, me, my) - they're implied",
          "Proofread carefully for spelling and grammar errors (read aloud)",
          "Save your CV as a PDF to preserve formatting (Name it 'YourName_CV.pdf')",
          "Include 3-5 bullet points per position (focus on recent roles)",
          "List technical skills separately with proficiency levels",
          "Remove outdated or irrelevant experiences (>10 years old unless relevant)",
          "Use reverse chronological order (most recent first)",
          "Include LinkedIn profile and portfolio link if applicable"
        ]);
        const verbExamples = ref([
          { weak: "was", strong: "Managed" },
          { weak: "were", strong: "Led" },
          { weak: "did", strong: "Executed" },
          { weak: "made", strong: "Created" },
          { weak: "helped", strong: "Assisted" },
          { weak: "worked on", strong: "Developed" },
          { weak: "assisted with", strong: "Supported" },
          { weak: "took part in", strong: "Participated in" },
          { weak: "was responsible for", strong: "Oversaw" },
          { weak: "handled", strong: "Managed" },
          { weak: "did stuff with", strong: "Implemented" },
          { weak: "fixed", strong: "Resolved" },
          { weak: "talked to", strong: "Consulted" },
          { weak: "set up", strong: "Established" },
          { weak: "made better", strong: "Optimized" }
        ]);
        
        // Strict analysis rules
        const analysisRules = {
          dates: {
            patterns: [
              { regex: /\b\d{1,2}\/\d{4}\b/g, label: "Good date format (MM/YYYY)" },
              { regex: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi, label: "Text month abbreviations" },
              { regex: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi, label: "Full month names" },
              { regex: /\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi, label: "Day included in dates" }
            ],
            recommendation: "Use MM/YYYY format (e.g., 03/2023) for best ATS compatibility"
          },
          weakVerbs: {
            verbs: [
              "was", "were", "did", "made", "helped", "worked on", 
              "assisted with", "took part in", "was responsible for",
              "handled", "looked after", "participated in",
              "did stuff with", "fixed", "talked to", "set up",
              "made better", "used", "had", "got", "put", "tried"
            ],
            strongAlternatives: [
              "Managed", "Led", "Developed", "Created", "Implemented",
              "Spearheaded", "Initiated", "Transformed", "Optimized",
              "Increased", "Reduced", "Improved", "Resolved", "Consulted",
              "Established", "Designed", "Built", "Launched", "Streamlined",
              "Pioneered", "Revolutionized", "Modernized", "Enhanced"
            ]
          },
          buzzwords: [
            "hard working", "team player", "detail oriented", "self motivated",
            "go getter", "think outside the box", "synergy", "value add",
            "results driven", "fast learner", "excellent communicator",
            "dynamic", "proactive", "passionate", "innovative", "strategic",
            "proven track record", "seasoned professional", "go-to person"
          ],
          formatting: {
            issues: [
              { regex: /<table|<td|<tr|border=|cellpadding|cellspacing/i, label: "Tables detected" },
              { regex: /column|multicolumn/i, label: "Multi-column layout" },
              { regex: /header|footer/i, label: "Headers/footers" },
              { regex: /<img|image|photo|graphic|\.jpg|\.png/i, label: "Images/graphics" },
              { regex: /●|■|★|→|◇|♠|♥|♦|♣/g, label: "Fancy bullet points" },
              { regex: /[^\x00-\x7F]+/g, label: "Special characters/emojis" },
              { regex: /\n{4,}/g, label: "Excessive blank space" },
              { regex: / {3,}/g, label: "Inconsistent spacing" },
              { regex: /font-family|font-size|text-align|margin|padding|color=/i, label: "Inline styling" },
              { regex: /[A-Z]{3,}/g, label: "Excessive capitalization" }
            ],
            recommendations: [
              "Use a simple one-column layout with clear section headings",
              "Avoid tables, headers, and footers - they confuse ATS systems",
              "Remove all images, graphics, and logos",
              "Use standard bullet points (• or -) consistently",
              "Maintain consistent spacing (1-2 line breaks between sections)",
              "Use a professional font (Arial, Calibri, Times New Roman) size 10-12pt",
              "Left-align all text (no centered or right-aligned text)",
              "Use bold only for section headings, not for emphasis",
              "Black text on white background only (no colors)"
            ]
          },
          sections: [
            { name: "contact", alternatives: ["phone", "email", "address", "contact info"], required: true },
            { name: "summary", alternatives: ["profile", "objective", "professional summary"], required: true },
            { name: "experience", alternatives: ["work history", "employment", "professional experience"], required: true },
            { name: "education", alternatives: ["qualifications", "academic background"], required: true },
            { name: "skills", alternatives: ["technical skills", "competencies", "core competencies"], required: true },
            { name: "certifications", alternatives: ["licenses", "certificates"], required: false },
            { name: "projects", alternatives: ["key projects", "selected projects"], required: false }
          ],
          keywords: {
            categories: {
              "Communication": ["communication", "presentation", "writing", "reporting", "negotiation", "public speaking", "interpersonal skills"],
              "Teamwork": ["teamwork", "collaboration", "cross-functional", "interdepartmental", "team building", "conflict resolution"],
              "Leadership": ["leadership", "management", "supervision", "mentoring", "directed", "coached", "team leadership"],
              "Problem Solving": ["problem solving", "analytical", "troubleshooting", "diagnosed", "root cause analysis", "critical thinking"],
              "Technical": ["technical", "software", "hardware", "systems", "IT", "programming", "coding", "debugging"],
              "Project Management": ["project management", "agile", "scrum", "waterfall", "deliverables", "milestones", "stakeholder management"],
              "Customer Service": ["customer service", "client relations", "account management", "customer satisfaction", "client retention"],
              "Sales": ["sales", "business development", "revenue growth", "account acquisition", "pipeline management", "CRM"],
              "Data Analysis": ["data analysis", "data visualization", "SQL", "Excel", "Power BI", "Tableau", "statistical analysis"],
              "Finance": ["financial analysis", "budgeting", "forecasting", "P&L", "financial reporting", "GAAP"]
            },
            missing: [
              "data analysis", "strategic planning", "budget management",
              "process improvement", "stakeholder management", "risk assessment",
              "performance metrics", "KPIs", "ROI", "SOPs", "change management",
              "continuous improvement", "best practices", "scalability",
              "user experience", "cloud computing", "cybersecurity"
            ]
          },
          experienceDepth: {
            minBullets: 3,
            maxBullets: 5,
            minWordsPerBullet: 10,
            maxWordsPerBullet: 25,
            recommendation: "Each position should have 3-5 bullet points with 10-25 words each, focusing on achievements with metrics"
          }
        };
        
        // Computed properties
        const summaryAlertClass = computed(() => {
          if (overallScore.value >= 95) return 'alert-success';
          if (overallScore.value >= 80) return 'alert-info';
          if (overallScore.value >= 60) return 'alert-warning';
          return 'alert-danger';
        });
        
        const summaryTitle = computed(() => {
          if (overallScore.value >= 95) return 'Excellent!';
          if (overallScore.value >= 80) return 'Good job!';
          if (overallScore.value >= 60) return 'Needs work.';
          return 'Requires significant improvement.';
        });
        
        const summaryMessage = computed(() => {
          if (overallScore.value >= 95) return 'Your CV is exceptionally well optimized for both ATS systems and human readers.';
          if (overallScore.value >= 80) return 'Your CV is strong but could use some refinements to be truly outstanding.';
          if (overallScore.value >= 60) return 'Your CV has several issues that need to be addressed to be competitive.';
          return 'Your CV needs substantial changes to be effective in today\'s job market.';
        });
        
        const uniqueImprovements = computed(() => {
          return [...new Set(improvements.value.map(issue => issue.message))].slice(0, 5);
        });
        
        // Methods
        const triggerFileInput = () => {
          fileInput.value.click();
        };
        
        const dragOver = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const uploadArea = document.querySelector('.upload-area');
          if (uploadArea) {
            uploadArea.style.borderColor = 'var(--secondary)';
            uploadArea.style.backgroundColor = '#f8f9fa';
          }
        };
        
        const dragLeave = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const uploadArea = document.querySelector('.upload-area');
          if (uploadArea) {
            uploadArea.style.borderColor = '#ccc';
            uploadArea.style.backgroundColor = 'white';
          }
        };
        
        const handleDrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          dragLeave(e);
          if (e.dataTransfer.files.length) {
            fileInput.value.files = e.dataTransfer.files;
            handleFileUpload();
          }
        };

        const handleFileUpload = () => {
          const file = fileInput.value?.files?.[0];
          if (!file) {
            alert("No file selected.");
            return;
          }

          isLoading.value = true;
          showResults.value = false;

          const ext = file.name.split('.').pop().toLowerCase();

          // Reset all scores and data when new file is uploaded
          overallScore.value = 0;
          atsScore.value = 0;
          readabilityScore.value = 0;
          impactScore.value = 0;
          contentIssues.value = [];
          formatIssues.value = [];
          readabilityIssues.value = [];
          quickFixes.value = [];
          strengths.value = [];
          improvements.value = [];
          keywordAnalysis.value = [];
          missingKeywords.value = [];

          switch (ext) {
            case 'pdf':
              parsePDF(file);
              break;
            case 'doc':
            case 'docx':
              // Check if mammoth is available before attempting to parse
              if (typeof mammoth === 'undefined') {
                alert('Word document support requires mammoth.js library. Please upload a PDF or text file instead.');
                isLoading.value = false;
              } else {
                parseWordDoc(file);
              }
              break;
            case 'txt':
            case 'rtf':
            case 'text':
              parseTextFile(file);
              break;
            default:
              alert('Unsupported file format. Please upload a PDF, Word, or Text file.');
              isLoading.value = false;
          }
        };

        const parsePDF = async (file) => {
          const reader = new FileReader();
          
          reader.onload = async function() {
            try {
              const typedarray = new Uint8Array(this.result);
              const pdf = await pdfjsLib.getDocument({data: typedarray}).promise;
              const totalPages = pdf.numPages;
              let fullText = [];
              
              // Process pages sequentially to maintain order
              for (let i = 1; i <= totalPages; i++) {
                try {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map(item => item.str).join(" ");
                  fullText.push(pageText);
                } catch (pageError) {
                  console.error(`Error processing page ${i}:`, pageError);
                  continue;
                }
              }
              
              if (fullText.length > 0) {
                analyzeText(fullText.join("\n"));
              } else {
                throw new Error("No text could be extracted from the PDF");
              }
              
            } catch (error) {
              console.error('PDF processing error:', error);
              alert('Error processing PDF. The file may be corrupted or password protected.');
              isLoading.value = false;
              showResults.value = false;
            }
          };

          reader.onerror = function() {
            alert('Error reading file');
            isLoading.value = false;
            showResults.value = false;
          };

          reader.readAsArrayBuffer(file);
        };

        const parseWordDoc = (file) => {
          const reader = new FileReader();
          
          reader.onload = async function(event) {
            try {
              // Check if mammoth is available
              if (typeof mammoth === 'undefined') {
                throw new Error('Word document parsing requires mammoth.js library');
              }
              
              const result = await mammoth.extractRawText({ 
                arrayBuffer: event.target.result 
              });
              
              if (result.value) {
                analyzeText(result.value);
              } else {
                throw new Error('No text could be extracted from the Word document');
              }
            } catch (error) {
              console.error('Word doc processing error:', error);
              alert(`Error processing Word document: ${error.message}`);
              isLoading.value = false;
              showResults.value = false;
            }
          };

          reader.onerror = function() {
            alert('Error reading file');
            isLoading.value = false;
            showResults.value = false;
          };

          reader.readAsArrayBuffer(file);
        };

        const parseTextFile = (file) => {
          const reader = new FileReader();
          
          reader.onload = function(e) {
            analyzeText(e.target.result);
          };

          reader.onerror = function() {
            alert('Error reading file');
            isLoading.value = false;
            showResults.value = false;
          };

          reader.readAsText(file);
        };

        const analyzeText = (text) => {
          try {
            // Validate input
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
              throw new Error('Document is empty or contains no text');
            }

            // Reset all data
            contentIssues.value = [];
            formatIssues.value = [];
            readabilityIssues.value = [];
            quickFixes.value = [];
            strengths.value = [];
            improvements.value = [];
            keywordAnalysis.value = [];
            missingKeywords.value = [];

            // Normalize text for analysis
            const normalizedText = text.replace(/\s+/g, ' ').trim();
            const lowerText = normalizedText.toLowerCase();

            // Initialize scores with more granular weights
            const scores = {
              ats: {
                value: 100,
                weights: {
                  sections: 0.3,
                  formatting: 0.4,
                  keywords: 0.3
                }
              },
              readability: {
                value: 100,
                weights: {
                  sentenceLength: 0.4,
                  paragraphLength: 0.3,
                  passiveVoice: 0.3
                }
              },
              impact: {
                value: 100,
                weights: {
                  actionVerbs: 0.4,
                  quantifiable: 0.4,
                  buzzwords: 0.2
                }
              }
            };

            // 1. ATS Compatibility Analysis
            const atsResults = analyzeATSCompatibility(normalizedText, lowerText);
            scores.ats.value = calculateATSScore(atsResults);
            contentIssues.value.push(...atsResults.contentIssues);
            formatIssues.value.push(...atsResults.formatIssues);

            // 2. Readability Analysis
            const readabilityResults = analyzeReadability(normalizedText);
            scores.readability.value = calculateReadabilityScore(readabilityResults);
            readabilityIssues.value.push(...readabilityResults.issues);

            // 3. Impact Analysis
            const impactResults = analyzeImpact(lowerText);
            scores.impact.value = calculateImpactScore(impactResults);
            contentIssues.value.push(...impactResults.issues);

            // 4. Experience Depth Analysis
            const experienceResults = analyzeExperienceDepth(normalizedText);
            contentIssues.value.push(...experienceResults.issues);

            // Calculate overall scores
            overallScore.value = calculateOverallScore(scores);
            atsScore.value = Math.round(scores.ats.value);
            readabilityScore.value = Math.round(scores.readability.value);
            impactScore.value = Math.round(scores.impact.value);

            // Generate feedback and suggestions
            generateFeedback(scores, atsResults, readabilityResults, impactResults);

            // Generate keyword analysis
            generateKeywordAnalysis(lowerText);

          } catch (error) {
            console.error('Analysis error:', error);
            alert(`Analysis failed: ${error.message}`);
            resetAnalysisState();
          } finally {
            isLoading.value = false;
            showResults.value = true;
            scrollToResults();
          }
        };

        // Helper functions for analysis
        const analyzeATSCompatibility = (text, lowerText) => {
          const results = {
            contentIssues: [],
            formatIssues: [],
            keywordMatches: 0,
            totalKeywords: 0
          };

          // Check required sections
          const sectionResults = analyzeSections(lowerText);
          results.contentIssues.push(...sectionResults.issues);

          // Check formatting
          const formatResults = analyzeFormatting(text);
          results.formatIssues.push(...formatResults.issues);

          // Check dates
          const dateResults = analyzeDates(lowerText);
          results.contentIssues.push(...dateResults);

          return results;
        };

        const analyzeSections = (lowerText) => {
          const results = { issues: [], missingSections: [] };
          const foundSections = [];
          
          // Check for each section
          analysisRules.sections.forEach(section => {
            const sectionPatterns = [section.name, ...section.alternatives];
            const found = sectionPatterns.some(pattern => 
              lowerText.includes(pattern.toLowerCase())
            );
            
            if (!found && section.required) {
              results.missingSections.push(section.name);
            }
          });
          
          if (results.missingSections.length > 0) {
            results.issues.push({
              message: `Missing required sections: ${results.missingSections.join(', ')}`,
              fix: "Add clearly labeled sections for all required categories",
              example: "Add sections like 'Professional Experience', 'Education', and 'Skills' with clear headings",
              priority: "high"
            });
          }
          
          return results;
        };

        const analyzeFormatting = (text) => {
          const results = { issues: [] };
          
          analysisRules.formatting.issues.forEach(issue => {
            if (issue.regex.test(text)) {
              results.issues.push({
                message: `Formatting issue: ${issue.label}`,
                fix: analysisRules.formatting.recommendations.join('; '),
                priority: "medium"
              });
            }
          });
          
          return results;
        };

        const analyzeDates = (lowerText) => {
          const issues = [];
          let hasGoodDates = false;
          
          analysisRules.dates.patterns.forEach(pattern => {
            if (pattern.regex.test(lowerText)) {
              if (pattern.label.includes("Good date format")) {
                hasGoodDates = true;
              } else {
                issues.push({
                  message: `Date format issue: ${pattern.label}`,
                  fix: analysisRules.dates.recommendation,
                  example: "Change 'June 2020' to '06/2020' for better ATS parsing",
                  priority: "low"
                });
              }
            }
          });
          
          if (!hasGoodDates) {
            issues.push({
              message: "No standard date formats (MM/YYYY) found",
              fix: analysisRules.dates.recommendation,
              example: "Format all dates as MM/YYYY (e.g., 06/2020 - 08/2022)",
              priority: "medium"
            });
          }
          
          return issues;
        };

        const analyzeExperienceDepth = (text) => {
          const results = { issues: [] };
          const experienceSections = text.match(/experience.*?\n(.*?)(?=\n\w+:|$)/gis);
          
          if (!experienceSections || experienceSections.length === 0) {
            results.issues.push({
              message: "No detailed work experience section found",
              fix: "Add a detailed work experience section with 3-5 bullet points per position",
              example: "For each position, include achievements with metrics like 'Increased sales by 30% in Q2 2021'",
              priority: "high"
            });
            return results;
          }
          
          const positions = experienceSections[0].split(/\n\s*\n/).filter(p => p.trim().length > 0);
          
          positions.forEach(position => {
            const bulletPoints = position.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
            
            if (bulletPoints.length < analysisRules.experienceDepth.minBullets) {
              results.issues.push({
                message: `Position has too few bullet points (${bulletPoints.length})`,
                fix: `Add more achievements to reach 3-5 bullet points per position`,
                example: "Include specific accomplishments with metrics for each role",
                priority: "medium"
              });
            }
            
            if (bulletPoints.length > analysisRules.experienceDepth.maxBullets) {
              results.issues.push({
                message: `Position has too many bullet points (${bulletPoints.length})`,
                fix: `Reduce to 3-5 most relevant and impactful bullet points`,
                example: "Keep only the most significant achievements for each role",
                priority: "low"
              });
            }
            
            bulletPoints.forEach(bullet => {
              const wordCount = bullet.split(/\s+/).length;
              if (wordCount < analysisRules.experienceDepth.minWordsPerBullet) {
                results.issues.push({
                  message: `Bullet point is too short (${wordCount} words)`,
                  fix: `Expand bullet points to 10-25 words with more details`,
                  example: "Add metrics and specifics to each achievement",
                  priority: "medium"
                });
              }
              
              if (wordCount > analysisRules.experienceDepth.maxWordsPerBullet) {
                results.issues.push({
                  message: `Bullet point is too long (${wordCount} words)`,
                  fix: `Shorten bullet points to 10-25 words for better readability`,
                  example: "Break long bullet points into multiple concise ones",
                  priority: "low"
                });
              }
            });
          });
          
          return results;
        };

        const analyzeReadability = (text) => {
          const results = {
            issues: [],
            metrics: {
              avgSentenceLength: 0,
              longParagraphs: 0,
              passiveVoiceCount: 0
            }
          };

          // Sentence length analysis
          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const totalWords = sentences.reduce((sum, sentence) => 
            sum + sentence.trim().split(/\s+/).length, 0);
          results.metrics.avgSentenceLength = totalWords / (sentences.length || 1);

          if (results.metrics.avgSentenceLength > 18) {
            results.issues.push({
              message: `Average sentence length is too long (${Math.round(results.metrics.avgSentenceLength)} words)`,
              fix: "Break long sentences into shorter ones (15-20 words maximum)",
              example: "Instead of 'I managed a team that was responsible for increasing sales by developing new strategies', try 'Managed a sales team. Developed new strategies that increased sales by 25%.'",
              priority: "medium"
            });
          }

          // Paragraph length analysis
          const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          results.metrics.longParagraphs = paragraphs.filter(p => 
            p.split(/\s+/).length > 50).length;

          if (results.metrics.longParagraphs > 0) {
            results.issues.push({
              message: `${results.metrics.longParagraphs} overly long paragraphs detected`,
              fix: "Keep paragraphs short (3-5 sentences max)",
              example: "Break long paragraphs into smaller chunks with clear focus",
              priority: "medium"
            });
          }

          // Passive voice detection
          const passiveMatches = text.match(/\b(?:was|were|been|being|am|are|is)\s+[a-z]+\b/gi) || [];
          results.metrics.passiveVoiceCount = passiveMatches.length;

          if (passiveMatches.length > 3) {
            results.issues.push({
              message: `Passive voice detected (${passiveMatches.length} instances)`,
              fix: "Rewrite sentences in active voice for stronger impact",
              example: "Change 'The project was completed by me' to 'I completed the project'",
              priority: "medium"
            });
          }

          return results;
        };

        const analyzeImpact = (lowerText) => {
          const results = {
            issues: [],
            strengths: [],
            actionVerbCount: 0,
            quantifiableCount: 0
          };

          // Action verbs analysis
          const verbResults = analyzeWeakVerbs(lowerText);
          results.issues.push(...verbResults);
          results.actionVerbCount = analysisRules.weakVerbs.strongAlternatives.filter(
            verb => lowerText.includes(verb.toLowerCase())).length;

          if (results.actionVerbCount > 5) {
            results.strengths.push("Good use of action verbs");
          }

          // Quantifiable achievements
          const numberMatches = (lowerText.match(/\d+/g) || []).length;
          results.quantifiableCount = numberMatches;
          
          if (numberMatches < 2) {
            results.issues.push({
              message: "Few quantifiable achievements found",
              fix: "Include numbers/metrics to quantify your impact (e.g., 'increased sales by 30%')",
              example: "Add specific metrics like percentages, dollar amounts, timeframes, or quantities",
              priority: "high"
            });
          } else {
            results.strengths.push("Includes quantifiable achievements");
          }

          // Buzzwords analysis
          const buzzwordResults = analyzeBuzzwords(lowerText);
          results.issues.push(...buzzwordResults);

          return results;
        };

        const analyzeWeakVerbs = (lowerText) => {
          const issues = [];
          
          analysisRules.weakVerbs.verbs.forEach(verb => {
            if (lowerText.includes(verb)) {
              const alternatives = analysisRules.weakVerbs.strongAlternatives.join(', ');
              issues.push({
                message: `Weak verb detected: "${verb}"`,
                fix: `Replace with stronger action verbs like: ${alternatives}`,
                example: `Change "${verb} responsible for sales" to "${analysisRules.weakVerbs.strongAlternatives[0]} sales team that increased revenue by 25%"`,
                priority: "medium"
              });
            }
          });
          
          return issues;
        };

        const analyzeBuzzwords = (lowerText) => {
          const issues = [];
          
          analysisRules.buzzwords.forEach(buzzword => {
            if (lowerText.includes(buzzword)) {
              issues.push({
                message: `Buzzword detected: "${buzzword}"`,
                fix: "Replace with specific examples of your skills/achievements",
                example: `Instead of "${buzzword}", say "Led a team of 5 that completed projects 20% ahead of schedule"`,
                priority: "low"
              });
            }
          });
          
          return issues;
        };

        const generateKeywordAnalysis = (lowerText) => {
          const matches = [];
          const missing = [];
          
          // Check for keyword category matches
          Object.entries(analysisRules.keywords.categories).forEach(([category, keywords]) => {
            const foundKeywords = keywords.filter(keyword => 
              lowerText.includes(keyword.toLowerCase())
            );
            
            if (foundKeywords.length > 0) {
              matches.push({
                name: category,
                keywords: foundKeywords.map(keyword => ({
                  name: keyword,
                  present: true
                })),
                count: foundKeywords.length
              });
            }
          });
          
          // Check for missing important keywords
          analysisRules.keywords.missing.forEach(keyword => {
            if (!lowerText.includes(keyword.toLowerCase())) {
              missing.push(keyword);
            }
          });
          
          keywordAnalysis.value = matches;
          missingKeywords.value = missing;
        };

        // Strict scoring calculation functions
        const calculateATSScore = (results) => {
          let score = 100;
          
          // Deduct for missing sections (high impact)
          const sectionIssues = results.contentIssues.filter(i => i.message.includes("Missing required sections"));
          score -= sectionIssues.length * 20; // Increased penalty
          
          // Deduct for formatting issues
          score -= results.formatIssues.length * 5; // Increased penalty
          
          // Deduct for date format issues
          const dateIssues = results.contentIssues.filter(i => i.message.includes("date"));
          score -= dateIssues.length * 3; // Increased penalty
          
          return Math.max(0, Math.min(100, score));
        };

        const calculateReadabilityScore = (results) => {
          let score = 100;
          
          // Sentence length penalty
          if (results.metrics.avgSentenceLength > 18) {
            score -= 15; // Increased penalty
          } else if (results.metrics.avgSentenceLength > 25) {
            score -= 25; // Increased penalty
          }
          
          // Paragraph length penalty
          score -= results.metrics.longParagraphs * 8; // Increased penalty
          
          // Passive voice penalty
          if (results.metrics.passiveVoiceCount > 3) {
            score -= 8 * Math.min(3, Math.floor(results.metrics.passiveVoiceCount / 3)); // Increased penalty
          }
          
          return Math.max(0, Math.min(100, score));
        };

        const calculateImpactScore = (results) => {
          let score = 100;
          
          // Action verb bonus (more strict)
          score += Math.min(5, results.actionVerbCount); // Reduced bonus
          
          // Quantifiable achievements bonus (more strict)
          score += Math.min(5, results.quantifiableCount * 2); // Reduced bonus
          
          // Buzzword penalty (more strict)
          const buzzwordIssues = results.issues.filter(i => i.message.includes("Buzzword"));
          score -= buzzwordIssues.length * 8; // Increased penalty
          
          return Math.max(0, Math.min(100, score));
        };

        const calculateOverallScore = (scores) => {
          return Math.round(
            (scores.ats.value * 0.5) + 
            (scores.readability.value * 0.3) + 
            (scores.impact.value * 0.2)
          );
        };

        // Feedback generation
        const generateFeedback = (scores, atsResults, readabilityResults, impactResults) => {
          // Generate score feedback
          if (overallScore.value >= 95) {
            scoreFeedback.value = 'Excellent! Your CV is exceptionally well optimized for both ATS systems and human readers.';
          } else if (overallScore.value >= 80) {
            scoreFeedback.value = 'Good job! Your CV is strong but could use some refinements to be truly outstanding.';
          } else if (overallScore.value >= 60) {
            scoreFeedback.value = 'Needs work. Your CV has several issues that need to be addressed to be competitive.';
          } else {
            scoreFeedback.value = 'Requires significant improvement. Your CV needs substantial changes to be effective in today\'s job market.';
          }

          // Generate strengths from all analysis results
          strengths.value = [
            ...impactResults.strengths,
            ...(atsResults.contentIssues.length === 0 ? ['All required sections included'] : []),
            ...(atsResults.formatIssues.length === 0 ? ['Clean, professional formatting'] : []),
            ...(readabilityResults.issues.length === 0 ? ['Excellent readability'] : []),
            ...(contentIssues.value.filter(i => i.message.includes("quantifiable")).length === 0 ? ['Strong use of quantifiable achievements'] : [])
          ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

          // Generate quick fixes (prioritized)
          const allIssues = [
            ...contentIssues.value,
            ...formatIssues.value,
            ...readabilityIssues.value
          ];
          
          quickFixes.value = allIssues
            .sort((a, b) => {
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
            .slice(0, 5);

          improvements.value = allIssues;
        };

        // Utility functions
        const resetAnalysisState = () => {
          isLoading.value = false;
          showResults.value = false;
          overallScore.value = 0;
          atsScore.value = 0;
          readabilityScore.value = 0;
          impactScore.value = 0;
        };

        const scrollToResults = () => {
          setTimeout(() => {
            const resultsSection = document.querySelector('.results-section');
            if (resultsSection) {
              resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        };
        
        const scrollToTop = () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        
        // Lifecycle hooks
        onMounted(() => {
          window.addEventListener('scroll', () => {
            showScrollToTop.value = window.pageYOffset > 300;
          });
        });
        
        return {
          // Refs
          fileInput,
          isLoading,
          showResults,
          showScrollToTop,
          
          // Data
          overallScore,
          atsScore,
          readabilityScore,
          impactScore,
          scoreFeedback,
          contentIssues,
          formatIssues,
          readabilityIssues,
          quickFixes,
          strengths,
          improvements,
          keywordAnalysis,
          missingKeywords,
          optimizationTips,
          verbExamples,
          
          // Computed
          summaryAlertClass,
          summaryTitle,
          summaryMessage,
          uniqueImprovements,
          
          // Methods
          triggerFileInput,
          dragOver,
          dragLeave,
          handleDrop,
          handleFileUpload,
          scrollToTop,
          scrollToResults
        };
      }
    }).mount('#app');

    document.getElementById('current-year').textContent = new Date().getFullYear();