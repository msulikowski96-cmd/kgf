# KGF Taxi - Local Development

## Prerequisites
1. Node.js v20+
2. PostgreSQL database

## Local Setup
1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Create a \`.env\` file from \`.env.example\` and update it with your local settings.
4. Push the database schema:
   \`\`\`bash
   npm run db:push
   \`\`\`

## Running the Project
- **Backend**: \`npm run server:dev\`
- **Frontend**: \`npm run expo:dev\`
- **Both**: \`npm run dev\`
