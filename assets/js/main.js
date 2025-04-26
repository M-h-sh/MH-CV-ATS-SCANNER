// Initialize PDF.js worker
pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    // Current year
    const currentYear = ref(new Date().getFullYear());
    
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
    const designScore = ref(0);
    const scoreFeedback = ref('Upload your CV to begin analysis');
    const contentIssues = ref([]);
    const formatIssues = ref([]);
    const readabilityIssues = ref([]);
    const designIssues = ref([]);
    const quickFixes = ref([]);
    const strengths = ref([]);
    const improvements = ref([]);
    const keywordAnalysis = ref([]);
    const missingKeywords = ref([]);
    const sectionOrderAnalysis = ref({ current: [], ideal: [], issues: [] });
    const quantificationAnalysis = ref({ ratio: 0, total: 0, quantified: 0, issues: [] });
    const colorAnalysis = ref([]);
    const contrastAnalysis = ref([]);
    const spellingErrors = ref([]);
    const grammarErrors = ref([]);
    const isCVFormat = ref(false);

    // Enhanced analysis rules with stricter criteria
    const analysisRules = {
      cvFormat: {
        requiredElements: [
          { name: "full_name", patterns: [/^[A-Z][a-z]+ [A-Z][a-z]+$/], required: true },
          { name: "contact_info", patterns: [/(phone|mobile|tel)|(email|e-mail)|(linkedin|github)/i], required: true },
          { name: "work_experience", patterns: [/(work|professional|employment) (history|experience)/i], required: true },
          { name: "education", patterns: [/(education|academic background|qualifications)/i], required: true }
        ],
        minLength: 300, // Minimum characters to be considered a CV
        professionalToneThreshold: 0.7 // 70% of content should be professional tone
      },
      dates: {
        patterns: [
          { regex: /\b\d{1,2}\/\d{4}\s*(?:-|to)\s*\d{1,2}\/\d{4}\b/g, label: "Good date range format (MM/YYYY - MM/YYYY)", score: 1 },
          { regex: /\b\d{1,2}\/\d{4}\b/g, label: "Good date format (MM/YYYY)", score: 0.8 },
          { regex: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi, label: "Text month abbreviations", score: 0.5 },
          { regex: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/gi, label: "Full month names", score: 0.3 },
          { regex: /\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/gi, label: "Day included in dates", score: 0.2 },
          { regex: /\bpresent\b/gi, label: "Using 'Present' for current position", score: 0.1 }
        ],
        recommendation: "Use MM/YYYY format (e.g., 03/2023 - 08/2023) for best ATS compatibility"
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
          { regex: /<table|<td|<tr|border=|cellpadding|cellspacing/i, label: "Tables detected", penalty: 10 },
          { regex: /column|multicolumn/i, label: "Multi-column layout", penalty: 8 },
          { regex: /header|footer/i, label: "Headers/footers", penalty: 5 },
          { regex: /<img|image|photo|graphic|\.jpg|\.png/i, label: "Images/graphics", penalty: 15 },
          { regex: /●|■|★|→|◇|♠|♥|♦|♣/g, label: "Fancy bullet points", penalty: 3 },
          { regex: /[^\x00-\x7F]+/g, label: "Special characters/emojis", penalty: 5 },
          { regex: /\n{4,}/g, label: "Excessive blank space", penalty: 2 },
          { regex: / {3,}/g, label: "Inconsistent spacing", penalty: 2 },
          { regex: /font-family|font-size|text-align|margin|padding|color=/i, label: "Inline styling", penalty: 5 },
          { regex: /[A-Z]{3,}/g, label: "Excessive capitalization", penalty: 3 }
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
        { name: "contact", alternatives: ["phone", "email", "address", "contact info"], required: true, penalty: 20 },
        { name: "summary", alternatives: ["profile", "objective", "professional summary"], required: true, penalty: 15 },
        { name: "experience", alternatives: ["work history", "employment", "professional experience"], required: true, penalty: 30 },
        { name: "education", alternatives: ["qualifications", "academic background"], required: true, penalty: 20 },
        { name: "skills", alternatives: ["technical skills", "competencies", "core competencies"], required: true, penalty: 15 },
        { name: "certifications", alternatives: ["licenses", "certificates"], required: false, penalty: 0 },
        { name: "projects", alternatives: ["key projects", "selected projects"], required: false, penalty: 0 },
        { name: "languages", alternatives: ["language skills"], required: false, penalty: 0 },
        { name: "awards", alternatives: ["honors", "achievements"], required: false, penalty: 0 }
      ],
      sectionOrder: [
        "contact",
        "summary",
        "experience",
        "education",
        "skills",
        "certifications",
        "projects",
        "languages",
        "awards"
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
      quantification: {
        requiredPatterns: [
          /\d+%/g,                         // Percentages
          /\$\d+/g,                        // Dollar amounts
          /\d+\s*(?:years|months)/gi,      // Time periods
          /increased by \d+/gi,            // Improvements
          /reduced by \d+/gi,              // Reductions
          /from \d+ to \d+/gi,             // Range improvements
          /\d+\s*(?:clients|customers)/gi, // Customer counts
          /team of \d+/gi,                 // Team sizes
          /over \d+/gi,                    // Thresholds
          /top \d+/gi,                     // Rankings
          /saved \$\d+/gi,                 // Cost savings
          /reduced time by \d+/gi,         // Time savings
          /improved efficiency by \d+/gi   // Efficiency gains
        ],
        minQuantified: 0.8 // 80% of bullet points should be quantified (stricter)
      },
      design: {
        maxColors: 2, // Stricter color limit
        minContrast: 4.5, // WCAG AA standard
        professionalFonts: [
          'Arial', 'Helvetica', 'Times New Roman', 
          'Georgia', 'Calibri', 'Garamond'
        ],
        maxFontSizes: 2, // Stricter font size limit
        standardFontSizes: {
          body: '10-12pt',
          headings: '14-16pt',
          name: '18-22pt'
        },
        unprofessionalColors: [
          'pink', 'neon', 'bright', 'lime', 'purple',
          'fuchsia', 'yellow', 'orange', 'red'
        ]
      },
      experienceDepth: {
        minBullets: 3,
        maxBullets: 6,
        minWordsPerBullet: 8,
        maxWordsPerBullet: 20,
        recommendation: "Each position should have 3-6 bullet points with 8-20 words each, focusing on achievements with metrics"
      },
      spelling: {
        commonErrors: [
          { incorrect: "responsable", correct: "responsible" },
          { incorrect: "experiance", correct: "experience" },
          { incorrect: "acheivement", correct: "achievement" },
          { incorrect: "collaborate", correct: "collaborate" },
          { incorrect: "managment", correct: "management" },
          { incorrect: "communcation", correct: "communication" },
          { incorrect: "profesional", correct: "professional" },
          { incorrect: "accomodate", correct: "accommodate" },
          { incorrect: "definately", correct: "definitely" },
          { incorrect: "seperate", correct: "separate" }
        ]
      },
      grammar: {
        commonErrors: [
          { pattern: /i\s+(?:was|am|have)/gi, fix: "Use first-person pronouns sparingly in CVs" },
          { pattern: /\b(?:alot)\b/gi, fix: "Should be 'a lot'" },
          { pattern: /\b(?:could of|would of|should of)\b/gi, fix: "Should be 'could have', 'would have', 'should have'" },
          { pattern: /between you and I/gi, fix: "Should be 'between you and me'" },
          { pattern: /less\s+\w+?s\b/gi, fix: "Use 'fewer' for countable items" }
        ]
      }
    };

    // Optimization tips and verb examples
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
      "Include 3-6 bullet points per position (focus on recent roles)",
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
      designScore.value = 0;
      contentIssues.value = [];
      formatIssues.value = [];
      readabilityIssues.value = [];
      designIssues.value = [];
      quickFixes.value = [];
      strengths.value = [];
      improvements.value = [];
      keywordAnalysis.value = [];
      missingKeywords.value = [];
      sectionOrderAnalysis.value = { current: [], ideal: [], issues: [] };
      quantificationAnalysis.value = { ratio: 0, total: 0, quantified: 0, issues: [] };
      colorAnalysis.value = [];
      contrastAnalysis.value = [];
      spellingErrors.value = [];
      grammarErrors.value = [];
      isCVFormat.value = false;

      switch (ext) {
        case 'pdf':
          parsePDF(file);
          break;
        case 'doc':
        case 'docx':
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
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          throw new Error('Document is empty or contains no text');
        }
        // Reset all data
        contentIssues.value = [];
        formatIssues.value = [];
        readabilityIssues.value = [];
        designIssues.value = [];
        quickFixes.value = [];
        strengths.value = [];
        improvements.value = [];
        keywordAnalysis.value = [];
        missingKeywords.value = [];
        sectionOrderAnalysis.value = { current: [], ideal: [], issues: [] };
        quantificationAnalysis.value = { ratio: 0, total: 0, quantified: 0, issues: [] };
        colorAnalysis.value = [];
        contrastAnalysis.value = [];
        spellingErrors.value = [];
        grammarErrors.value = [];

        // Normalize text for analysis
        const normalizedText = text.replace(/\s+/g, ' ').trim();
        const lowerText = normalizedText.toLowerCase();

        // Initialize scores with weights
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
          },
          design: {
            value: 100,
            weights: {
              colors: 0.3,
              fonts: 0.3,
              contrast: 0.4
            }
          }
        };

        // 1. Check spelling and grammar first (heavier penalties)
        const spellingResults = analyzeSpelling(normalizedText);
        spellingErrors.value = spellingResults.errors;
        
        const grammarResults = analyzeGrammar(normalizedText);
        grammarErrors.value = grammarResults.errors;
        
        // Apply penalties for spelling/grammar errors
        scores.ats.value -= spellingErrors.value.length * 5;
        scores.ats.value -= grammarErrors.value.length * 3;
        scores.readability.value -= (spellingErrors.value.length + grammarErrors.value.length) * 2;

        // 2. ATS Compatibility Analysis
        const atsResults = analyzeATSCompatibility(normalizedText, lowerText);
        scores.ats.value = calculateATSScore(atsResults);
        contentIssues.value.push(...atsResults.contentIssues);
        formatIssues.value.push(...atsResults.formatIssues);

        // 3. Readability Analysis
        const readabilityResults = analyzeReadability(normalizedText);
        scores.readability.value = calculateReadabilityScore(readabilityResults);
        readabilityIssues.value.push(...readabilityResults.issues);

        // 4. Impact Analysis
        const impactResults = analyzeImpact(lowerText);
        scores.impact.value = calculateImpactScore(impactResults);
        contentIssues.value.push(...impactResults.issues);

        // 5. Experience Depth Analysis
        const experienceResults = analyzeExperienceDepth(normalizedText);
        contentIssues.value.push(...experienceResults.issues);

        // 6. Design Analysis
        const designResults = analyzeDesign(normalizedText);
        scores.design.value = calculateDesignScore(designResults);
        designIssues.value.push(...designResults.issues);
        colorAnalysis.value = designResults.colors;
        contrastAnalysis.value = designResults.contrast;

        // 7. Section Order Analysis
        const sectionOrderResults = analyzeSectionOrder(normalizedText);
        sectionOrderAnalysis.value = sectionOrderResults;

        // 8. Quantification Analysis (stricter check)
        const quantificationResults = analyzeQuantification(normalizedText);
        quantificationAnalysis.value = quantificationResults;
        if (quantificationResults.issues.length > 0) {
          contentIssues.value.push(...quantificationResults.issues);
        }

        // Calculate overall scores
        overallScore.value = calculateOverallScore(scores);
        atsScore.value = Math.round(scores.ats.value);
        readabilityScore.value = Math.round(scores.readability.value);
        impactScore.value = Math.round(scores.impact.value);
        designScore.value = Math.round(scores.design.value);

        // Generate feedback and suggestions
        generateFeedback(scores, atsResults, readabilityResults, impactResults, designResults);

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

    // New function to check if document is actually a CV
    const checkCVFormat = (text) => {
      const lowerText = text.toLowerCase();
      let score = 0;
      
      // Check minimum length
      if (text.length < analysisRules.cvFormat.minLength) {
        return false;
      }
      
      // Check for required CV elements
      analysisRules.cvFormat.requiredElements.forEach(element => {
        if (element.required) {
          const found = element.patterns.some(pattern => 
            typeof pattern === 'string' ? 
            lowerText.includes(pattern.toLowerCase()) : 
            pattern.test(text)
          );
          if (found) score += 1;
        }
      });
      
      // Check for professional tone (looking for common CV phrases)
      const professionalPhrases = [
        'work experience', 'professional summary', 'technical skills',
        'education background', 'responsibilities included', 'achievements',
        'managed a team', 'increased sales', 'improved efficiency',
        'led projects', 'developed strategies'
      ];
      
      const professionalMatches = professionalPhrases.filter(phrase => 
        lowerText.includes(phrase.toLowerCase())
      ).length;
      
      const professionalScore = professionalMatches / professionalPhrases.length;
      
      // Must have at least 50% of required elements and professional tone
      const requiredScore = score / analysisRules.cvFormat.requiredElements.filter(e => e.required).length;
      return requiredScore >= 0.5 && professionalScore >= analysisRules.cvFormat.professionalToneThreshold;
    };

    // New function to analyze spelling
    const analyzeSpelling = (text) => {
      const results = { errors: [] };
      
      analysisRules.spelling.commonErrors.forEach(error => {
        const matches = text.match(new RegExp(`\\b${error.incorrect}\\b`, 'gi'));
        if (matches && matches.length > 0) {
          results.errors.push({
            type: "Spelling",
            error: error.incorrect,
            fix: `Should be '${error.correct}'`,
            count: matches.length
          });
        }
      });
      
      return results;
    };

    // New function to analyze grammar
    const analyzeGrammar = (text) => {
      const results = { errors: [] };
      
      analysisRules.grammar.commonErrors.forEach(error => {
        const matches = text.match(error.pattern);
        if (matches && matches.length > 0) {
          results.errors.push({
            type: "Grammar",
            error: matches[0],
            fix: error.fix,
            count: matches.length
          });
        }
      });
      
      return results;
    };

    // Analysis helper functions
    const analyzeATSCompatibility = (text, lowerText) => {
      const results = {
        contentIssues: [],
        formatIssues: [],
        keywordMatches: 0,
        totalKeywords: 0
      };

      // Check required sections (stricter penalty)
      const sectionResults = analyzeSections(lowerText);
      results.contentIssues.push(...sectionResults.issues);

      // Check formatting (stricter penalty)
      const formatResults = analyzeFormatting(text);
      results.formatIssues.push(...formatResults.issues);

      // Check dates (stricter check)
      const dateResults = analyzeDates(lowerText);
      results.contentIssues.push(...dateResults);

      return results;
    };

    const analyzeSections = (lowerText) => {
      const results = { issues: [], missingSections: [] };
      
      analysisRules.sections.forEach(section => {
        const sectionPatterns = [section.name, ...section.alternatives];
        const found = sectionPatterns.some(pattern => 
          lowerText.includes(pattern.toLowerCase())
        );
        
        if (!found && section.required) {
          results.missingSections.push({
            name: section.name,
            penalty: section.penalty
          });
        }
      });
      
      if (results.missingSections.length > 0) {
        const totalPenalty = results.missingSections.reduce((sum, section) => sum + section.penalty, 0);
        results.issues.push({
          message: `Missing required sections: ${results.missingSections.map(s => s.name).join(', ')}`,
          fix: "Add clearly labeled sections for all required categories",
          example: "Add sections like 'Professional Experience', 'Education', and 'Skills' with clear headings",
          priority: "high",
          count: results.missingSections.length,
          penalty: totalPenalty
        });
      }
      
      return results;
    };

    const analyzeFormatting = (text) => {
      const results = { issues: [] };
      
      analysisRules.formatting.issues.forEach(issue => {
        const matches = text.match(issue.regex);
        if (matches && matches.length > 0) {
          results.issues.push({
            message: `Formatting issue: ${issue.label}`,
            fix: analysisRules.formatting.recommendations.join('; '),
            priority: "medium",
            count: matches.length,
            penalty: issue.penalty
          });
        }
      });
      
      return results;
    };

    const analyzeDates = (lowerText) => {
      const issues = [];
      let bestDateScore = 0;
      
      analysisRules.dates.patterns.forEach(pattern => {
        const matches = lowerText.match(pattern.regex);
        if (matches && matches.length > 0) {
          // Track the highest score we find
          if (pattern.score > bestDateScore) {
            bestDateScore = pattern.score;
          }
          
          // Only flag issues for non-optimal formats
          if (pattern.score < 0.8) {
            issues.push({
              message: `Date format issue: ${pattern.label}`,
              fix: analysisRules.dates.recommendation,
              example: "Change 'June 2020' to '06/2020' for better ATS parsing",
              priority: "low",
              count: matches.length,
              penalty: Math.round((1 - pattern.score) * 5) // Scale penalty by how bad the format is
            });
          }
        }
      });
      
      // If we didn't find any good date formats
      if (bestDateScore < 0.5) {
        issues.push({
          message: "No standard date formats (MM/YYYY) found",
          fix: analysisRules.dates.recommendation,
          example: "Format all dates as MM/YYYY (e.g., 06/2020 - 08/2022)",
          priority: "medium",
          count: 1,
          penalty: 10
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
          fix: "Add a detailed work experience section with 3-6 bullet points per position",
          example: "For each position, include achievements with metrics like 'Increased sales by 30% in Q2 2021'",
          priority: "high",
          count: 1,
          penalty: 15
        });
        return results;
      }
      
      const positions = experienceSections[0].split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      positions.forEach(position => {
        const bulletPoints = position.split('\n').filter(line => 
          line.trim().startsWith('•') || 
          line.trim().startsWith('-') ||
          line.trim().match(/^\d+\./)
        );
        
        if (bulletPoints.length < analysisRules.experienceDepth.minBullets) {
          results.issues.push({
            message: `Position has too few bullet points (${bulletPoints.length})`,
            fix: `Add more achievements to reach 3-6 bullet points per position`,
            example: "Include specific accomplishments with metrics for each role",
            priority: "medium",
            count: 1,
            penalty: 10
          });
        }
        
        if (bulletPoints.length > analysisRules.experienceDepth.maxBullets) {
          results.issues.push({
            message: `Position has too many bullet points (${bulletPoints.length})`,
            fix: `Reduce to 3-6 most relevant and impactful bullet points`,
            example: "Keep only the most significant achievements for each role",
            priority: "low",
            count: 1,
            penalty: 5
          });
        }
        
        bulletPoints.forEach(bullet => {
          const wordCount = bullet.split(/\s+/).length;
          if (wordCount < analysisRules.experienceDepth.minWordsPerBullet) {
            results.issues.push({
              message: `Bullet point is too short (${wordCount} words)`,
              fix: `Expand bullet points to 8-20 words with more details`,
              example: "Add metrics and specifics to each achievement",
              priority: "medium",
              count: 1,
              penalty: 3
            });
          }
          
          if (wordCount > analysisRules.experienceDepth.maxWordsPerBullet) {
            results.issues.push({
              message: `Bullet point is too long (${wordCount} words)`,
              fix: `Shorten bullet points to 8-20 words for better readability`,
              example: "Break long bullet points into multiple concise ones",
              priority: "low",
              count: 1,
              penalty: 2
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

      if (results.metrics.avgSentenceLength > 15) {
        results.issues.push({
          message: `Average sentence length is too long (${Math.round(results.metrics.avgSentenceLength)} words)`,
          fix: "Break long sentences into shorter ones (12-15 words maximum)",
          example: "Instead of 'I managed a team that was responsible for increasing sales by developing new strategies', try 'Managed a sales team. Developed new strategies that increased sales by 25%.'",
          priority: "medium",
          count: 1,
          penalty: 5
        });
      }

      // Paragraph length analysis
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      results.metrics.longParagraphs = paragraphs.filter(p => 
        p.split(/\s+/).length > 40).length;

      if (results.metrics.longParagraphs > 0) {
        results.issues.push({
          message: `${results.metrics.longParagraphs} overly long paragraphs detected`,
          fix: "Keep paragraphs short (2-4 sentences max)",
          example: "Break long paragraphs into smaller chunks with clear focus",
          priority: "medium",
          count: results.metrics.longParagraphs,
          penalty: results.metrics.longParagraphs * 3
        });
      }

      // Passive voice detection
      const passiveMatches = text.match(/\b(?:was|were|been|being|am|are|is)\s+[a-z]+\b/gi) || [];
      results.metrics.passiveVoiceCount = passiveMatches.length;

      if (passiveMatches.length > 2) {
        results.issues.push({
          message: `Passive voice detected (${passiveMatches.length} instances)`,
          fix: "Rewrite sentences in active voice for stronger impact",
          example: "Change 'The project was completed by me' to 'I completed the project'",
          priority: "medium",
          count: passiveMatches.length,
          penalty: passiveMatches.length * 2
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

      // Action verbs analysis (stricter check)
      const verbResults = analyzeWeakVerbs(lowerText);
      results.issues.push(...verbResults);
      results.actionVerbCount = analysisRules.weakVerbs.strongAlternatives.filter(
        verb => lowerText.includes(verb.toLowerCase())).length;

      if (results.actionVerbCount > 8) { // Higher threshold for strength
        results.strengths.push("Excellent use of action verbs");
      } else if (results.actionVerbCount > 4) {
        results.strengths.push("Good use of action verbs");
      }

      // Quantifiable achievements (stricter check)
      const numberMatches = (lowerText.match(/\d+/g) || []).length;
      results.quantifiableCount = numberMatches;
      
      if (numberMatches < 3) { // Higher minimum
        results.issues.push({
          message: "Insufficient quantifiable achievements found",
          fix: "Include numbers, percentages, and metrics to your achievements",
          example: "Add specific metrics like percentages, dollar amounts, timeframes, or quantities",
          priority: "high",
          count: 1,
          penalty: 15
        });
      } else if (numberMatches > 5) {
        results.strengths.push("Excellent use of quantifiable achievements");
      } else {
        results.strengths.push("Includes some quantifiable achievements");
      }

      // Buzzwords analysis (stricter penalty)
      const buzzwordResults = analyzeBuzzwords(lowerText);
      results.issues.push(...buzzwordResults);

      return results;
    };

    const analyzeWeakVerbs = (lowerText) => {
      const issues = [];
      
      analysisRules.weakVerbs.verbs.forEach(verb => {
        const matches = lowerText.match(new RegExp(`\\b${verb}\\b`, 'gi'));
        if (matches && matches.length > 0) {
          const alternatives = analysisRules.weakVerbs.strongAlternatives.join(', ');
          issues.push({
            message: `Weak verb detected: "${verb}" (${matches.length}x)`,
            fix: `Replace with stronger action verbs like: ${alternatives}`,
            example: `Change "${verb} responsible for sales" to "${analysisRules.weakVerbs.strongAlternatives[0]} sales team that increased revenue by 25%"`,
            priority: "medium",
            count: matches.length,
            penalty: matches.length * 3
          });
        }
      });
      
      return issues;
    };

    const analyzeBuzzwords = (lowerText) => {
      const issues = [];
      
      analysisRules.buzzwords.forEach(buzzword => {
        const matches = lowerText.match(new RegExp(`\\b${buzzword}\\b`, 'gi'));
        if (matches && matches.length > 0) {
          issues.push({
            message: `Buzzword detected: "${buzzword}" (${matches.length}x)`,
            fix: "Replace with specific examples of your skills/achievements",
            example: `Instead of "${buzzword}", say "Led a team of 5 that completed projects 20% ahead of schedule"`,
            priority: "low",
            count: matches.length,
            penalty: matches.length * 2
          });
        }
      });
      
      return issues;
    };

    const analyzeDesign = (text) => {
      const results = {
        issues: [],
        colors: [],
        contrast: []
      };
      
      // Color analysis (simplified - would use PDF parsing in real implementation)
      const colorMatches = text.match(/#[0-9a-f]{6}|rgb\([^)]+\)|color:\s*[^;]+/gi) || [];
      
      colorMatches.forEach(match => {
        if (match.startsWith('#')) {
          results.colors.push(match);
        } else if (match.startsWith('rgb')) {
          results.colors.push(match);
        }
      });
      
      // Remove duplicates
      results.colors = [...new Set(results.colors)];
      
      // Check color count (stricter)
      if (results.colors.length > analysisRules.design.maxColors) {
        results.issues.push({
          message: `Too many colors (${results.colors.length}) - professional CVs should use 1-2 colors max`,
          fix: "Reduce your color palette to 1-2 professional colors",
          priority: "medium",
          count: results.colors.length,
          penalty: (results.colors.length - analysisRules.design.maxColors) * 5
        });
      }
      
      // Check for unprofessional colors (stricter)
      const unprofessionalColors = results.colors.filter(color => {
        return analysisRules.design.unprofessionalColors.some(term => 
          color.toLowerCase().includes(term)
        );
      });
      
      if (unprofessionalColors.length > 0) {
        results.issues.push({
          message: `Unprofessional colors detected: ${unprofessionalColors.join(', ')}`,
          fix: "Use more professional, muted colors (blues, dark grays, etc.)",
          priority: "medium",
          count: unprofessionalColors.length,
          penalty: unprofessionalColors.length * 8
        });
      }
      
      // Contrast analysis (simplified - would use actual color analysis in real implementation)
      results.contrast = [
        { textColor: "#000000", bgColor: "#FFFFFF", ratio: 21 }, // Perfect
        { textColor: "#333333", bgColor: "#CCCCCC", ratio: 5.5 }, // Good
        { textColor: "#666666", bgColor: "#999999", ratio: 2.3 } // Poor
      ];
      
      const poorContrast = results.contrast.filter(c => c.ratio < analysisRules.design.minContrast);
      if (poorContrast.length > 0) {
        results.issues.push({
          message: `Poor contrast detected in ${poorContrast.length} color combinations`,
          fix: "Ensure text has sufficient contrast with background (minimum 4.5:1 ratio)",
          example: `Avoid combinations like ${poorContrast[0].textColor} on ${poorContrast[0].bgColor}`,
          priority: "high",
          count: poorContrast.length,
          penalty: poorContrast.length * 10
        });
      }
      
      return results;
    };

    const analyzeSectionOrder = (text) => {
      const results = {
        current: [],
        ideal: [],
        issues: []
      };
      
      const lowerText = text.toLowerCase();
      
      // Find which sections exist in the document
      analysisRules.sectionOrder.forEach(section => {
        const patterns = [section, ...(analysisRules.sections.find(s => s.name === section)?.alternatives || [])];
        const found = patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
        if (found) results.current.push(section);
      });
      
      // Determine ideal order (only including sections that exist)
      results.ideal = analysisRules.sectionOrder.filter(section => 
        results.current.includes(section)
      );
      
      // Check if order matches (stricter penalty)
      if (JSON.stringify(results.current) !== JSON.stringify(results.ideal)) {
        results.issues.push({
          message: "Non-standard section order detected",
          fix: "Reorder sections to follow standard CV structure: Contact → Summary → Experience → Education → Skills",
          priority: "high",
          count: 1,
          penalty: 15
        });
      }
      
      return results;
    };

    const analyzeQuantification = (text) => {
      const results = {
        ratio: 0,
        total: 0,
        quantified: 0,
        issues: [],
        examples: []
      };
      
      const bulletPoints = extractBulletPoints(text);
      results.total = bulletPoints.length;
      
      if (results.total === 0) {
        results.issues.push({
          message: "No bullet points found in experience section",
          fix: "Add 3-6 bullet points per position describing your achievements",
          priority: "high",
          count: 1,
          penalty: 20
        });
        return results;
      }
      
      // Count quantified bullet points (stricter check)
      bulletPoints.forEach(bullet => {
        const isQuantified = analysisRules.quantification.requiredPatterns.some(
          pattern => pattern.test(bullet)
        );
        
        if (isQuantified) {
          results.quantified++;
        } else if (results.examples.length < 3) {
          results.examples.push(bullet.substring(0, 50) + (bullet.length > 50 ? '...' : ''));
        }
      });
      
      results.ratio = results.quantified / results.total;
      
      if (results.ratio < analysisRules.quantification.minQuantified) {
        results.issues.push({
          message: `Only ${Math.round(results.ratio * 100)}% of bullet points are quantified (aim for 80%+)`,
          fix: "Add numbers, percentages, and metrics to your achievements",
          examples: results.examples,
          priority: "high",
          count: Math.floor((1 - results.ratio) * results.total),
          penalty: Math.floor((1 - results.ratio) * 20) // Scale penalty by how much we're missing
        });
      }
      
      return results;
    };

    const extractBulletPoints = (text) => {
      // Extract bullet points from experience section
      const experienceSection = text.match(/experience.*?\n(.*?)(?=\n\w+:|$)/gis);
      if (!experienceSection) return [];
      
      return experienceSection[0]
        .split('\n')
        .filter(line => 
          line.trim().startsWith('•') || 
          line.trim().startsWith('-') ||
          line.trim().match(/^\d+\./)
        )
        .map(line => line.trim());
    };

    const generateKeywordAnalysis = (lowerText) => {
      const matches = [];
      const missing = [];
      
      // Check for keyword category matches (stricter check)
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
      
      // Check for missing important keywords (stricter check)
      analysisRules.keywords.missing.forEach(keyword => {
        if (!lowerText.includes(keyword.toLowerCase())) {
          missing.push(keyword);
        }
      });
      
      keywordAnalysis.value = matches;
      missingKeywords.value = missing;
    };

    // Scoring functions (updated with stricter criteria)
    const calculateATSScore = (results) => {
      let score = 100;
      
      // Apply penalties from issues
      results.contentIssues.forEach(issue => {
        score -= issue.penalty || 0;
      });
      
      results.formatIssues.forEach(issue => {
        score -= issue.penalty || 0;
      });
      
      // Additional penalty if score is still too high but has critical issues
      if (score > 70 && (results.contentIssues.some(i => i.priority === "high") || results.formatIssues.some(i => i.priority === "high"))) {
        score = Math.min(score, 70);
      }
      
      return Math.max(0, Math.min(100, score));
    };

    const calculateReadabilityScore = (results) => {
      let score = 100;
      
      // Apply penalties from issues
      results.issues.forEach(issue => {
        score -= issue.penalty || 0;
      });
      
      return Math.max(0, Math.min(100, score));
    };

    const calculateImpactScore = (results) => {
      let score = 100;
      
      // Apply penalties from issues
      results.issues.forEach(issue => {
        score -= issue.penalty || 0;
      });
      
      // Bonus for strengths (smaller to avoid over-inflation)
      if (results.strengths.includes("Excellent use of action verbs")) score += 5;
      if (results.strengths.includes("Excellent use of quantifiable achievements")) score += 5;
      
      return Math.max(0, Math.min(100, score));
    };

    const calculateDesignScore = (results) => {
      let score = 100;
      
      // Apply penalties from issues
      results.issues.forEach(issue => {
        score -= issue.penalty || 0;
      });
      
      return Math.max(0, Math.min(100, score));
    };

    const calculateOverallScore = (scores) => {
      // Stricter weighting - ATS compatibility is most important
      return Math.round(
        (scores.ats.value * 0.5) + // 50% weight for ATS
        (scores.readability.value * 0.2) + 
        (scores.impact.value * 0.2) +
        (scores.design.value * 0.1) // Only 10% for design
      );
    };

    // Feedback generation (updated with stricter criteria)
    const generateFeedback = (scores, atsResults, readabilityResults, impactResults, designResults) => {
      // Generate score feedback
      if (overallScore.value >= 90) {
        scoreFeedback.value = 'Excellent! Your CV is well-optimized for ATS and human readers.';
      } else if (overallScore.value >= 75) {
        scoreFeedback.value = 'Good. Your CV is acceptable but has room for improvement to be truly competitive.';
      } else if (overallScore.value >= 50) {
        scoreFeedback.value = 'Needs Significant Work. Your CV needs major improvements to pass modern ATS systems.';
      } else {
        scoreFeedback.value = 'Poor Quality. Your CV requires complete restructuring to be effective.';
      }

      // Generate strengths from all analysis results
      strengths.value = [
        ...impactResults.strengths,
        ...(atsResults.contentIssues.length === 0 ? ['All required sections included'] : []),
        ...(atsResults.formatIssues.length === 0 ? ['Clean, professional formatting'] : []),
        ...(readabilityResults.issues.length === 0 ? ['Excellent readability'] : []),
        ...(designResults.issues.length === 0 ? ['Professional design'] : []),
        ...(contentIssues.value.filter(i => i.message.includes("quantifiable")).length === 0 ? ['Strong use of quantifiable achievements'] : []),
        ...(spellingErrors.value.length === 0 ? ['No spelling errors'] : []),
        ...(grammarErrors.value.length === 0 ? ['No grammar errors'] : [])
      ].filter((v, i, a) => a.indexOf(v) === i);

      // Generate quick fixes (prioritized by penalty)
      const allIssues = [
        ...contentIssues.value,
        ...formatIssues.value,
        ...readabilityIssues.value,
        ...designIssues.value,
        ...sectionOrderAnalysis.value.issues,
        ...quantificationAnalysis.value.issues,
        ...spellingErrors.value.map(e => ({
          message: `Spelling error: ${e.error}`,
          fix: e.fix,
          priority: "high",
          count: e.count,
          penalty: 5
        })),
        ...grammarErrors.value.map(e => ({
          message: `Grammar issue: ${e.error}`,
          fix: e.fix,
          priority: "high",
          count: e.count,
          penalty: 3
        }))
      ];
      
      quickFixes.value = allIssues
        .sort((a, b) => b.penalty - a.penalty || b.priority.localeCompare(a.priority))
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
      designScore.value = 0;
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
      currentYear,
      fileInput,
      isLoading,
      showResults,
      showScrollToTop,
      overallScore,
      atsScore,
      readabilityScore,
      impactScore,
      designScore,
      scoreFeedback,
      contentIssues,
      formatIssues,
      readabilityIssues,
      designIssues,
      quickFixes,
      strengths,
      improvements,
      keywordAnalysis,
      missingKeywords,
      sectionOrderAnalysis,
      quantificationAnalysis,
      colorAnalysis,
      contrastAnalysis,
      spellingErrors,
      grammarErrors,
      isCVFormat,
      optimizationTips,
      verbExamples,
      
      // Computed
      summaryAlertClass: computed(() => {
        if (overallScore.value >= 90) return 'alert-success';
        if (overallScore.value >= 75) return 'alert-info';
        if (overallScore.value >= 50) return 'alert-warning';
        return 'alert-danger';
      }),
      
      summaryTitle: computed(() => {
        if (overallScore.value >= 90) return 'Excellent!';
        if (overallScore.value >= 75) return 'Good';
        if (overallScore.value >= 50) return 'Needs Work';
        return 'Poor Quality';
      }),
      
      summaryMessage: computed(() => {
        if (overallScore.value >= 90) return 'Your CV is well-optimized for both ATS and human readers.';
        if (overallScore.value >= 75) return 'Your CV is acceptable but has room for improvement.';
        if (overallScore.value >= 50) return 'Your CV needs major improvements to pass modern ATS systems.';
        return 'Your CV requires complete restructuring to be effective.';
      }),
      
      uniqueImprovements: computed(() => {
        return [...new Set(improvements.value.map(issue => issue.message))].slice(0, 5);
      }),
      
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