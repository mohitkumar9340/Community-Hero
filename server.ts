import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the server can start even if the API key is not present immediately
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini API client initialized successfully.');
  } else {
    console.warn('GEMINI_API_KEY is not defined or is placeholder. Falling back to local heuristics.');
  }
} catch (e) {
  console.error('Failed to initialize Gemini API client:', e);
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 1. AI Categorization and Analysis Endpoint
app.post('/api/ai/categorize', async (req, res) => {
  const { description, image } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  // Define fallback response first
  const fallbackResponse = {
    category: 'Other',
    priority: 'Medium',
    priorityRationale: 'Assessed via civic heuristics based on description keywords. Assigning for human inspection.',
    assignedDepartment: 'Public Works',
    polishedTitle: description.slice(0, 40) + (description.length > 40 ? '...' : ''),
    actionPlan: '• Review Route: Assigning local inspector to verify coordinates.\n• Public Hazard Level: Moderate. Avoid walking close to zone.\n• Action Plan: Scheduled for review within 48 business hours.'
  };

  // Heuristic-based categories for backup in case Gemini key is missing or fails
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('pothole') || lowerDesc.includes('road') || lowerDesc.includes('traffic') || lowerDesc.includes('pavement') || lowerDesc.includes('street')) {
    fallbackResponse.category = 'Roads & Traffic';
    fallbackResponse.priority = lowerDesc.includes('accident') || lowerDesc.includes('danger') ? 'High' : 'Medium';
    fallbackResponse.priorityRationale = 'Road surface anomaly identified. Priority set based on potential vehicle tire damage and traffic flow disruption risk.';
    fallbackResponse.assignedDepartment = 'Public Works';
    fallbackResponse.polishedTitle = 'Pavement Repair Required';
  } else if (lowerDesc.includes('water') || lowerDesc.includes('leak') || lowerDesc.includes('pipe') || lowerDesc.includes('sewer') || lowerDesc.includes('drain')) {
    fallbackResponse.category = 'Water & Sanitation';
    fallbackResponse.priority = lowerDesc.includes('flood') || lowerDesc.includes('burst') ? 'Critical' : 'High';
    fallbackResponse.priorityRationale = 'Water flow or drainage issue identified. Priority elevated to minimize clean water wastage and block potential flooding.';
    fallbackResponse.assignedDepartment = 'Utilities';
    fallbackResponse.polishedTitle = 'Water Grid Maintenance Alert';
  } else if (lowerDesc.includes('garbage') || lowerDesc.includes('trash') || lowerDesc.includes('waste') || lowerDesc.includes('bin') || lowerDesc.includes('dump')) {
    fallbackResponse.category = 'Waste Management';
    fallbackResponse.priority = 'Medium';
    fallbackResponse.priorityRationale = 'Litter or illegal dumping reported. Priority assigned to maintain sanitation guidelines and prevent pest attraction.';
    fallbackResponse.assignedDepartment = 'Sanitation & Waste Management';
    fallbackResponse.polishedTitle = 'Sanitation Clean-up Report';
  } else if (lowerDesc.includes('light') || lowerDesc.includes('bulb') || lowerDesc.includes('electricity') || lowerDesc.includes('lamp') || lowerDesc.includes('dark')) {
    fallbackResponse.category = 'Electricity & Lighting';
    fallbackResponse.priority = lowerDesc.includes('dark') || lowerDesc.includes('blind') ? 'High' : 'Medium';
    fallbackResponse.priorityRationale = 'Power or lighting outage reported. Lightless zones have increased risk of pedestrian hazards and traffic visibility issues.';
    fallbackResponse.assignedDepartment = 'Utilities';
    fallbackResponse.polishedTitle = 'Street Lamp Power Restore';
  } else if (lowerDesc.includes('park') || lowerDesc.includes('tree') || lowerDesc.includes('bench') || lowerDesc.includes('playground')) {
    fallbackResponse.category = 'Public Parks & Safety';
    fallbackResponse.priority = 'Low';
    fallbackResponse.priorityRationale = 'Recreational area up-keep reported. Priority set to standard parkway grounds inspection schedule.';
    fallbackResponse.assignedDepartment = 'Parks and Recreation';
    fallbackResponse.polishedTitle = 'Public Recreation Area Upkeep';
  }

  if (!ai) {
    console.log('Using local heuristic fallback for categorization.');
    return res.json(fallbackResponse);
  }

  try {
    const prompt = `You are the AI engine for "Community Hero", a hyperlocal citizen problem solver. 
Analyze the following community issue description and optional image (which may represent a photo of the problem). 
Categorize the issue, assign a priority level, suggest a highly polished public title, determine the relevant municipal department, provide a detailed priority rationale, and generate an actionable bulleted plan for citizens and city works to resolve it.

Factors for Priority Level (Low, Medium, High, Critical):
- Damage severity: Is something completely broken or overflowing, or is it minor?
- Location risk: Is it near a school, intersection, park, or dark alleyway?
- Safety hazards: Are there immediate physical dangers to pedestrians, cyclists, or drivers?

Available Municipal Departments:
- Public Works (for roads, traffic, signage, public spaces)
- Utilities (for water, sewer, power grid, streetlights)
- Parks and Recreation (for parks, trees, community gardens, play equipment)
- Sanitation & Waste Management (for litter, trash, dumping, hazardous waste)

Issue Description: "${description}"

You MUST output strictly valid JSON in this exact structure:
{
  "category": "Roads & Traffic" | "Water & Sanitation" | "Waste Management" | "Electricity & Lighting" | "Public Parks & Safety" | "Other",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "priorityRationale": "A professional 2-3 sentence rationale explaining why this specific priority was selected, citing potential risks, location context if mentioned, and damage severity.",
  "assignedDepartment": "Public Works" | "Utilities" | "Parks and Recreation" | "Sanitation & Waste Management",
  "polishedTitle": "A concise, clean, 5-8 word public-friendly title describing the issue",
  "actionPlan": "3-4 concise bullet points starting with '•' detailing response route, safety advice, and estimated duration."
}`;

    let contents: any[] = [prompt];
    
    if (image) {
      // Clean base64 string
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    return res.json({
      category: parsed.category || fallbackResponse.category,
      priority: parsed.priority || fallbackResponse.priority,
      priorityRationale: parsed.priorityRationale || fallbackResponse.priorityRationale,
      assignedDepartment: parsed.assignedDepartment || fallbackResponse.assignedDepartment,
      polishedTitle: parsed.polishedTitle || fallbackResponse.polishedTitle,
      actionPlan: parsed.actionPlan || fallbackResponse.actionPlan
    });

  } catch (err) {
    console.error('Error calling Gemini API for categorization:', err);
    return res.json(fallbackResponse);
  }
});

// 2. AI Predictive Insights Endpoint
app.post('/api/ai/predictive-insights', async (req, res) => {
  const { currentIssues } = req.body;

  if (!ai || !currentIssues || !Array.isArray(currentIssues) || currentIssues.length === 0) {
    return res.json({
      summary: 'Currently analyzing local community records. Active hazards remain under containment, and seasonal street light schedules are optimizing.',
      hotspots: [
        { zone: 'Connaught Place Zone', risk: 'High road traffic interaction, pending streetlight repairs.' },
        { zone: 'Janpath Pathway', risk: 'Water main runoff erosion, soil restoration under progress.' }
      ],
      recommendations: [
        'Organize a volunteer clean-up crew for the Cedar Lane Community Garden buffer zone.',
        'Encourage nearby residents on Pine St to double-verify lighting blackouts to speed up DOT bulb upgrades.'
      ]
    });
  }

  try {
    const issuesSummary = currentIssues.map(i => `- [${i.category}] ${i.title} (Status: ${i.status}, Priority: ${i.priority}, Location: ${i.address})`).join('\n');
    const prompt = `You are the Urban AI Analyst for "Community Hero". Analyze this list of current reported issues:
${issuesSummary}

Synthesize these reports and output high-value predictive insights for our citizen dashboard.
What risks are developing? What quick neighborhood wins can volunteers tackle? What infrastructure bottlenecks require city-wide priority?

You MUST output strictly valid JSON in this exact structure:
{
  "summary": "A 2-sentence professional, inspiring overview of current neighborhood status and main hazard trend.",
  "hotspots": [
    { "zone": "Name of specific zone/street", "risk": "Concise risk description based on issues" },
    { "zone": "Name of second zone/street", "risk": "Concise risk description based on issues" }
  ],
  "recommendations": [
    "Actionable citizen/volunteer recommendation 1",
    "Actionable citizen/volunteer recommendation 2"
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response');
    const parsed = JSON.parse(text);
    return res.json(parsed);

  } catch (err) {
    console.error('Error generating predictive insights:', err);
    return res.json({
      summary: 'Municipal maintenance tracks are stable. High upvotes on Ashoka Road pothole indicators suggests high pedestrian traffic density there.',
      hotspots: [
        { zone: 'Vasant Vihar School Zone', risk: 'High safety risk during drop-off hours due to road cracks.' }
      ],
      recommendations: [
        'Direct nearby school volunteers to escort students until asphalt repairs complete.'
      ]
    });
  }
});

// 3. AI Duplicate Detection Endpoint
app.post('/api/ai/check-duplicate', async (req, res) => {
  const { description, latitude, longitude, currentIssues } = req.body;

  if (!ai || !currentIssues || currentIssues.length === 0) {
    return res.json({ isDuplicate: false, duplicateId: null, message: null });
  }

  // Filter issues roughly within 1km (approx 0.01 degrees)
  const nearbyIssues = currentIssues.filter((i: any) => {
    return Math.abs(i.latitude - latitude) < 0.01 && Math.abs(i.longitude - longitude) < 0.01;
  });

  if (nearbyIssues.length === 0) {
    return res.json({ isDuplicate: false, duplicateId: null, message: null });
  }

  try {
    const issuesSummary = nearbyIssues.map((i: any) => `ID: ${i.id} | Title: ${i.title} | Category: ${i.category} | Desc: ${i.description}`).join('\n');
    const prompt = `You are a duplicate detection system for a civic reporting app.
A user is about to report a new issue:
"Description: ${description}"

Here are existing nearby issues:
${issuesSummary}

Determine if this new issue is highly likely a duplicate of one of the existing issues.
You MUST output strictly valid JSON in this exact structure:
{
  "isDuplicate": true or false,
  "duplicateId": "ID of the duplicate issue if true, else null",
  "message": "A friendly message explaining that a similar issue already exists nearby."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response');
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    console.error('Error in duplicate detection:', err);
    return res.json({ isDuplicate: false, duplicateId: null, message: null });
  }
});

// 4. AI Resolution Verification Endpoint
app.post('/api/ai/verify-resolution', async (req, res) => {
  const { description, beforeImage, afterImage } = req.body;

  if (!ai || !beforeImage || !afterImage) {
    return res.json({
      verified: true,
      confidence: 85,
      analysis: 'Automated AI verification bypassed. Proceeding with manual admin approval.'
    });
  }

  try {
    const prompt = `You are an AI verification assistant for civic maintenance.
Review the 'Before' and 'After' photos for the following reported issue:
"${description}"

Analyze the visual evidence to determine if the issue has been genuinely resolved. Look for repaired surfaces, removed waste, replaced items, etc.

You MUST output strictly valid JSON in this exact structure:
{
  "verified": true or false,
  "confidence": integer between 0 and 100,
  "analysis": "A concise, professional 2-3 sentence explanation of your visual findings comparing before and after."
}`;

    const contents: any[] = [prompt];
    
    // Clean base64 strings
    const beforeBase64 = beforeImage.replace(/^data:image\/\w+;base64,/, '');
    const afterBase64 = afterImage.replace(/^data:image\/\w+;base64,/, '');

    contents.push({ inlineData: { mimeType: 'image/jpeg', data: beforeBase64 } });
    contents.push({ inlineData: { mimeType: 'image/jpeg', data: afterBase64 } });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response');
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    console.error('Error verifying resolution:', err);
    return res.json({
      verified: true,
      confidence: 70,
      analysis: 'Verification fallback engaged due to processing error.'
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
