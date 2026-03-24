# 1. Use a lightweight version of Node.js 
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy your package files first (this makes future updates much faster)
COPY package*.json ./

# 4. Install your project dependencies
RUN npm install

# 5. Copy the rest of your backend code into the container
COPY . .

# 6. Set environment variables based on the current architecture
ENV PORT=5003
ENV MONGODB_URI=mongodb+srv://drharsh821115_db_user:Lxq3reHn72K04jrn@power0.qpo1o6h.mongodb.net/?appName=power0
ENV JWT_EXPIRE=7d
ENV APP_URL=https://studyspace-two.vercel.app
ENV AUTH0_DOMAIN=dev-2smqcpbeqiguukg3.us.auth0.com
ENV AUTH0_AUDIENCE=https://dev-2smqcpbeqiguukg3.us.auth0.com/api/v2/
ENV JWT_SECRET=secretkey
ENV GOOGLE_CLIENT_ID=6HGmwUkG1xjqKO3DlLAMl3ExAI92Oj7a
ENV AUTH0_CLIENT_SECRET=qwcI0L1leOTuroqGPOr4-5GVjujGtOhYauUbnY4n6iAsUCGE15iatSirV1vJbo6c
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587
ENV SMTP_USER=sadiv120@gmail.com
ENV SMTP_PASS=frynumtgnvvfayyv

# 7. Expose the port your app runs on
EXPOSE 5003

# 8. The command to start your server
CMD ["node", "server.js"]