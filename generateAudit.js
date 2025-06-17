// const Anthropic = require('@anthropic-ai/sdk');

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY
// });

// async function generateAudit(scrapedData) {
//   console.log('Generating AI audit...');

//   const prompt = createAuditPrompt(scrapedData);

//   try {
//     const response = await anthropic.messages.create({
//       model: process.envCLAUDE_MODEL_ID,
//       max_tokens: 2000,
//       temperature: 0.7,
//       system: "You are a senior CRO (Conversion Rate Optimization) expert with 10+ years of experience. Analyze websites for conversion potential and provide actionable recommendations.",
//       messages: [
//         {
//           role: "user",
//           content: prompt
//         }
//       ]
//     });

//     const auditText = response.content[0].text;

//     // Parse the audit response into sections
//     const auditSections = parseAuditResponse(auditText);

//     console.log('AI audit generated successfully');
//     return auditSections;

//   } catch (error) {
//     console.error('Anthropic API error:', error);
//     throw new Error(`Failed to generate audit: ${error.message}`);
//   }
// }

// function createAuditPrompt(data) {
//   return `
// You are analyzing a website for CRO effectiveness. Here's the extracted data:

// **Website URL:** ${data.url}
// **Page Title:** ${data.title}
// **Meta Description:** ${data.metaDescription}
// **Load Time:** ${data.loadTime}ms

// **Page Headings:**
// - H1: ${data.headings.h1.join(', ') || 'None found'}
// - H2: ${data.headings.h2.slice(0, 5).join(', ') || 'None found'}

// **Call-to-Action Elements (first 10):**
// ${data.ctas.slice(0, 10).map(cta => `- ${cta.type.toUpperCase()}: "${cta.text}"`).join('\n')}

// **Forms Found:** ${data.forms.length} forms
// ${data.forms.map(form => `- Form with ${form.inputs.length} inputs`).join('\n')}

// **Trust Signals:**
// - Testimonials/Reviews: ${data.trustSignals.testimonials} elements
// - Certifications/Badges: ${data.trustSignals.certifications} elements  
// - Social Proof: ${data.trustSignals.socialProof} elements
// - Security Badges: ${data.trustSignals.securityBadges} elements

// **Page Content Sample:** ${data.textContent.substring(0, 500)}...

// **Screenshots Taken:** ${data.screenshots.length} screenshots including full page, hero section, and mobile view

// Please analyze this website's CRO effectiveness in exactly these 5 sections:

// 1. **First Impressions**
// 2. **Call-to-Actions** 
// 3. **UX/Layout/Speed**
// 4. **Trust Signals**
// 5. **Mobile Responsiveness**

// For each section, provide:
// - 2-4 specific observations
// - 2-3 actionable recommendations
// - Rate the section from 1-10

// Format your response clearly with headers for each section. Write in a professional but accessible tone suitable for a client presentation.
// `;
// }

// function parseAuditResponse(auditText) {
//   const sections = {
//     firstImpressions: '',
//     callToActions: '',
//     uxLayoutSpeed: '',
//     trustSignals: '',
//     mobileResponsiveness: ''
//   };

//   // Split the audit text into sections based on headers
//   const sectionHeaders = [
//     'First Impressions',
//     'Call-to-Actions',
//     'UX/Layout/Speed', 
//     'Trust Signals',
//     'Mobile Responsiveness'
//   ];

//   let currentSection = '';
//   const lines = auditText.split('\n');

//   for (const line of lines) {
//     const trimmedLine = line.trim();

//     // Check if this line is a section header
//     let foundHeader = false;
//     for (const header of sectionHeaders) {
//       if (trimmedLine.toLowerCase().includes(header.toLowerCase()) || 
//           trimmedLine.includes('**' + header + '**') ||
//           trimmedLine.includes('## ' + header)) {

//         currentSection = header.toLowerCase().replace(/[^a-z]/g, '');
//         if (currentSection === 'calltoactions') currentSection = 'callToActions';
//         if (currentSection === 'uxlayoutspeed') currentSection = 'uxLayoutSpeed';
//         if (currentSection === 'trustsignals') currentSection = 'trustSignals';
//         if (currentSection === 'mobileresponsiveness') currentSection = 'mobileResponsiveness';

//         foundHeader = true;
//         break;
//       }
//     }

//     // If not a header and we have a current section, add to that section
//     if (!foundHeader && currentSection && sections[currentSection] !== undefined) {
//       sections[currentSection] += line + '\n';
//     }
//   }

//   // Clean up sections and provide fallbacks
//   Object.keys(sections).forEach(key => {
//     sections[key] = sections[key].trim() || 'Analysis pending - please review manually.';
//   });

//   // If parsing failed, split by common patterns
//   if (Object.values(sections).every(section => section === 'Analysis pending - please review manually.')) {
//     return parseAuditFallback(auditText);
//   }

//   return sections;
// }

// function parseAuditFallback(auditText) {
//   // Fallback parsing method
//   const sections = auditText.split(/(?=\d\.|##|\*\*)/);

//   return {
//     firstImpressions: sections[1] || auditText.substring(0, auditText.length / 5),
//     callToActions: sections[2] || auditText.substring(auditText.length / 5, (auditText.length / 5) * 2),
//     uxLayoutSpeed: sections[3] || auditText.substring((auditText.length / 5) * 2, (auditText.length / 5) * 3),
//     trustSignals: sections[4] || auditText.substring((auditText.length / 5) * 3, (auditText.length / 5) * 4),
//     mobileResponsiveness: sections[5] || auditText.substring((auditText.length / 5) * 4)
//   };
// }

// module.exports = { generateAudit };




require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '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' // Replace with your actual key temporarily
});

async function generateAudit(scrapedData) {
    console.log('Generating AI audit...');

    const prompt = createAuditPrompt(scrapedData);

    try {
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            temperature: 0.7,
            system: "You are a senior CRO (Conversion Rate Optimization) expert with 10+ years of experience. Analyze websites for conversion potential and provide actionable recommendations.",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const auditText = response.content[0].text;

        // Parse the audit response into sections
        const auditSections = parseAuditResponse(auditText);

        console.log('AI audit generated successfully');
        return auditSections;

    } catch (error) {
        console.error('Anthropic API error:', error);
        throw new Error(`Failed to generate audit: ${error.message}`);
    }
}

function createAuditPrompt(data) {
    return `
You are analyzing a website for CRO effectiveness. Here's the extracted data:

**Website URL:** ${data.url}
**Page Title:** ${data.title}
**Meta Description:** ${data.metaDescription}
**Load Time:** ${data.loadTime}ms

**Page Headings:**
- H1: ${data.headings.h1.join(', ') || 'None found'}
- H2: ${data.headings.h2.slice(0, 5).join(', ') || 'None found'}

**Call-to-Action Elements (first 10):**
${data.ctas.slice(0, 10).map(cta => `- ${cta.type.toUpperCase()}: "${cta.text}"`).join('\n')}

**Forms Found:** ${data.forms.length} forms
${data.forms.map(form => `- Form with ${form.inputs.length} inputs`).join('\n')}

**Trust Signals:**
- Testimonials/Reviews: ${data.trustSignals.testimonials} elements
- Certifications/Badges: ${data.trustSignals.certifications} elements  
- Social Proof: ${data.trustSignals.socialProof} elements
- Security Badges: ${data.trustSignals.securityBadges} elements

**Page Content Sample:** ${data.textContent.substring(0, 500)}...

**Screenshots Taken:** ${data.screenshots.length} screenshots including full page, hero section, and mobile view

Please analyze this website's CRO effectiveness in exactly these 5 sections:

1. **First Impressions**
2. **Call-to-Actions** 
3. **UX/Layout/Speed**
4. **Trust Signals**
5. **Mobile Responsiveness**

For each section, provide:
- 2-4 specific observations
- 2-3 actionable recommendations
- Rate the section from 1-10

Format your response clearly with headers for each section. Write in a professional but accessible tone suitable for a client presentation.
`;
}

function parseAuditResponse(auditText) {
    const sections = {
        firstImpressions: '',
        callToActions: '',
        uxLayoutSpeed: '',
        trustSignals: '',
        mobileResponsiveness: ''
    };

    // Split the audit text into sections based on headers
    const sectionHeaders = [
        'First Impressions',
        'Call-to-Actions',
        'UX/Layout/Speed',
        'Trust Signals',
        'Mobile Responsiveness'
    ];

    let currentSection = '';
    const lines = auditText.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this line is a section header
        let foundHeader = false;
        for (const header of sectionHeaders) {
            if (trimmedLine.toLowerCase().includes(header.toLowerCase()) ||
                trimmedLine.includes('**' + header + '**') ||
                trimmedLine.includes('## ' + header)) {

                currentSection = header.toLowerCase().replace(/[^a-z]/g, '');
                if (currentSection === 'calltoactions') currentSection = 'callToActions';
                if (currentSection === 'uxlayoutspeed') currentSection = 'uxLayoutSpeed';
                if (currentSection === 'trustsignals') currentSection = 'trustSignals';
                if (currentSection === 'mobileresponsiveness') currentSection = 'mobileResponsiveness';

                foundHeader = true;
                break;
            }
        }

        // If not a header and we have a current section, add to that section
        if (!foundHeader && currentSection && sections[currentSection] !== undefined) {
            sections[currentSection] += line + '\n';
        }
    }

    // Clean up sections and provide fallbacks
    Object.keys(sections).forEach(key => {
        sections[key] = sections[key].trim() || 'Analysis pending - please review manually.';
    });

    // If parsing failed, split by common patterns
    if (Object.values(sections).every(section => section === 'Analysis pending - please review manually.')) {
        return parseAuditFallback(auditText);
    }

    return sections;
}

function parseAuditFallback(auditText) {
    // Fallback parsing method
    const sections = auditText.split(/(?=\d\.|##|\*\*)/);

    return {
        firstImpressions: sections[1] || auditText.substring(0, auditText.length / 5),
        callToActions: sections[2] || auditText.substring(auditText.length / 5, (auditText.length / 5) * 2),
        uxLayoutSpeed: sections[3] || auditText.substring((auditText.length / 5) * 2, (auditText.length / 5) * 3),
        trustSignals: sections[4] || auditText.substring((auditText.length / 5) * 3, (auditText.length / 5) * 4),
        mobileResponsiveness: sections[5] || auditText.substring((auditText.length / 5) * 4)
    };
}

module.exports = { generateAudit };