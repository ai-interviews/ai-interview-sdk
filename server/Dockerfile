# Choose a base image
FROM node:14

# Make a directory in the image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to workdir
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the server code to the Docker image
COPY . .

# Expose the port that your app uses (replace with your actual port)
EXPOSE 4200

# Set the command to run your app
CMD [ "npm", "start" ]
