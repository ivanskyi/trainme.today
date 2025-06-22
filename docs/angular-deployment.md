
# Deploy Angular App to GitHub Pages

## Steps

1. **Check outputPath**

   In `angular.json` it should be:
   ```json
   "outputPath": "dist/frontend"
   ```

2. **Add scripts to `package.json` (in frontend folder)**
   ```json
   "scripts": {
     "build": "ng build --configuration production",
     "deploy": "npx angular-cli-ghpages --dir=dist/frontend"
   }
   ```

3. **Install dependency**
   ```
   npm install --save-dev angular-cli-ghpages
   ```

4. **Build and deploy**
   ```
   npm run build
   npm run deploy
   ```

5. **Check GitHub Pages**
    - Enable GitHub Pages in your repository settings.
    - Your site will be available at:
      ```
      https://<your-username>.github.io/<repository-name>/
      ```
