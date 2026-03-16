# G-Hire Architecture

## Multimodal AI Agent
G-Hire is a **Multimodal AI Agent** (Category: **UI Navigator / Live Agent**) that understands:
- **Text**: Natural language project descriptions.
- **Vision**: Design screenshots and UI references to extract technical requirements.
- **Voice**: Real-time speech-to-text interaction in the AI Chat.

## System Flow
1. **User Input**: User submits text, speaks via voice, or uploads a design image.
2. **AI Analysis (Gemini)**: The backend sends the multimodal input to Gemini to extract structured data.
3. **Database (Firestore)**: The project is stored in Firestore.
4. **Matching Engine**: The system queries the `freelancers` collection and ranks them.
5. **Results**: The top 5 matches are displayed.
6. **Outreach**: Trigger simulated outreach with Gemini-generated personalized messages.

## Tech Stack
- **Frontend**: React, TailwindCSS, Motion, Lucide Icons.
- **Backend**: Express (Node.js) serving as a full-stack host.
- **AI**: Google Gemini API (@google/genai).
- **Database**: Google Cloud Firestore.

## Data Models
- **Project**: Title, Description, Skills, Budget, Timeline, Status, UserID.
- **Freelancer**: Name, Skills, Experience, Rating, Price Range, Availability.
- **Response**: ProjectID, FreelancerID, Message, Status.

## Diagram
```
User -> [React Frontend] -> [Express API] -> [Gemini AI]
                                  |
                                  v
                          [Cloud Firestore]
```
