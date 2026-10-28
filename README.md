BrandTruth AI

Catch brand mistakes before publishing.

BrandTruth AI helps teams check marketing content against approved brand facts and rules. It identifies potential issues, suggests corrections, and supports a review and approval workflow.

Live Demo

Live Website: [Add your deployed website link here]

Anyone with the link can access the website.

No sign-up is required to start the demo.

Users can try the Manager, Creator, and Reviewer workflows.

Sample data from the fictional brand Chai Tapri Co. is provided.

Features

Manage approved brand facts and rules.

Check poster text and supported uploaded images.

Detect potential brand inconsistencies.

Get AI-assisted explanations and suggested fixes.

Submit content for review and approval.

Track comments, versions, and decisions.

Tech Stack

Frontend: React, Vite, Tailwind CSS

Backend: Node.js, Express

Database: MongoDB or in-memory storage

AI: Google Gemini (optional)

Run Locally

# Start the backend
cd server
npm install
npm run dev

# Start the frontend in another terminal
cd client
npm install
npm run dev

Environment Variables

Configure GEMINI_API_KEY for AI features and MONGODB_URI for persistent database storage. The application supports fallback checks without these optional services.

Testing

cd server
npm test