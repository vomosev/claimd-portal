# Deployment Action

```
name: Deploy to Vercel with Custom Domain

on:
  repository_dispatch:
    types: [deploy-with-domain]
  workflow_dispatch:
    inputs:
      domain_prefix:
        description: 'Domain prefix for primary domain'
        required: true
        type: string
      domain_backup:
        description: 'Domain prefix for backup domain'
        required: true
        type: string
      base_url:
        description: 'Base URL for the application'
        required: true
        type: string

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Action Repository
      uses: actions/checkout@v4
      
    - name: Set Environment Variables
      run: |
        if [ "${{ github.event_name }}" == "repository_dispatch" ]; then
          echo "DOMAIN_PREFIX=${{ github.event.client_payload.domain_prefix || vars.DOMAIN_PREFIX }}" >> $GITHUB_ENV
          echo "DOMAIN_BACKUP=${{ github.event.client_payload.domain_backup || vars.DOMAIN_BACKUP }}" >> $GITHUB_ENV
          echo "BASE_URL=${{ github.event.client_payload.base_url || vars.BASE_URL }}" >> $GITHUB_ENV
        else
          echo "DOMAIN_PREFIX=${{ github.event.inputs.domain_prefix || vars.DOMAIN_PREFIX }}" >> $GITHUB_ENV
          echo "DOMAIN_BACKUP=${{ github.event.inputs.domain_backup || vars.DOMAIN_BACKUP }}" >> $GITHUB_ENV
          echo "BASE_URL=${{ github.event.inputs.base_url || vars.BASE_URL }}" >> $GITHUB_ENV
        fi
        
        # Generate unique deployment identifier
        echo "DEPLOYMENT_ID=deploy-$(date +%s)-$(echo $RANDOM | md5sum | head -c 8)" >> $GITHUB_ENV
        echo "PRIMARY_DOMAIN=${DOMAIN_PREFIX}.ega-tech.co.uk" >> $GITHUB_ENV
        echo "BACKUP_DOMAIN=${DOMAIN_BACKUP}.ega-tech.co.uk" >> $GITHUB_ENV

    - name: Clone Target Repository
      run: |
        echo "Cloning repository..."
        git clone https://github.com/certifi-world/${{ vars.TARGET_REPO_NAME || 'main-app' }}.git target-repo
        cd target-repo
        echo "Repository cloned successfully"
        ls -la

    - name: Create .env File
      run: |
        cd target-repo
        echo "Creating .env file..."
        cat > .env << EOF
        DOMAIN_PREFIX=${{ env.DOMAIN_PREFIX }}
        DOMAIN_BACKUP=${{ env.DOMAIN_BACKUP }}
        BASE_URL=${{ env.BASE_URL }}
        DEPLOYMENT_ID=${{ env.DEPLOYMENT_ID }}
        PRIMARY_DOMAIN=${{ env.PRIMARY_DOMAIN }}
        BACKUP_DOMAIN=${{ env.BACKUP_DOMAIN }}
        VERCEL_ENV=production
        NODE_ENV=production
        EOF
        
        echo ".env file created:"
        cat .env
        
        # Verify file exists
        if [ -f .env ]; then
          echo "✅ .env file created successfully"
        else
          echo "❌ Failed to create .env file"
          exit 1
        fi

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: target-repo/package-lock.json

    - name: Install Dependencies
      run: |
        cd target-repo
        if [ -f package.json ]; then
          npm ci
        else
          echo "No package.json found, skipping npm install"
        fi

    - name: Install Vercel CLI
      run: npm i -g vercel@latest

    - name: Pull Vercel Environment Information
      run: |
        cd target-repo
        vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

    - name: Build Project Artifacts
      run: |
        cd target-repo
        vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

    - name: Deploy to Vercel
      id: vercel-deploy
      run: |
        cd target-repo
        echo "Deploying to Vercel..."
        
        # Deploy to Vercel and capture the URL
        VERCEL_URL=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }} 2>&1 | grep -E 'https://.*\.vercel\.app' | tail -1)
        
        if [ -z "$VERCEL_URL" ]; then
          echo "❌ Failed to get Vercel deployment URL"
          exit 1
        fi
        
        echo "VERCEL_URL=$VERCEL_URL" >> $GITHUB_OUTPUT
        echo "✅ Deployed to Vercel: $VERCEL_URL"

    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ vars.AWS_REGION || 'us-east-1' }}

    - name: Add Primary DNS Record to Route53
      run: |
        echo "Adding primary DNS record: ${{ env.PRIMARY_DOMAIN }}"
        
        # Get the hosted zone ID
        HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "ega-tech.co.uk" --query "HostedZones[0].Id" --output text | sed 's|/hostedzone/||')
        
        if [ "$HOSTED_ZONE_ID" == "None" ] || [ -z "$HOSTED_ZONE_ID" ]; then
          echo "❌ Could not find hosted zone for ega-tech.co.uk"
          exit 1
        fi
        
        echo "Found hosted zone ID: $HOSTED_ZONE_ID"
        
        # Extract the domain from Vercel URL (remove https:// and any trailing paths)
        VERCEL_DOMAIN=$(echo "${{ steps.vercel-deploy.outputs.VERCEL_URL }}" | sed 's|https://||' | sed 's|/.*||')
        
        # Create the change batch JSON
        cat > change-batch-primary.json << EOF
        {
          "Comment": "Add CNAME record for ${{ env.PRIMARY_DOMAIN }}",
          "Changes": [
            {
              "Action": "UPSERT",
              "ResourceRecordSet": {
                "Name": "${{ env.PRIMARY_DOMAIN }}",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                  {
                    "Value": "$VERCEL_DOMAIN"
                  }
                ]
              }
            }
          ]
        }
        EOF
        
        echo "Change batch for primary domain:"
        cat change-batch-primary.json
        
        # Apply the DNS change
        aws route53 change-resource-record-sets \
          --hosted-zone-id "$HOSTED_ZONE_ID" \
          --change-batch file://change-batch-primary.json
        
        echo "✅ Primary DNS record added successfully"

    - name: Add Backup DNS Record to Route53
      run: |
        echo "Adding backup DNS record: ${{ env.BACKUP_DOMAIN }}"
        
        # Get the hosted zone ID (same as primary)
        HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "ega-tech.co.uk" --query "HostedZones[0].Id" --output text | sed 's|/hostedzone/||')
        
        # Extract the domain from Vercel URL
        VERCEL_DOMAIN=$(echo "${{ steps.vercel-deploy.outputs.VERCEL_URL }}" | sed 's|https://||' | sed 's|/.*||')
        
        # Create the change batch JSON for backup domain
        cat > change-batch-backup.json << EOF
        {
          "Comment": "Add CNAME record for ${{ env.BACKUP_DOMAIN }}",
          "Changes": [
            {
              "Action": "UPSERT",
              "ResourceRecordSet": {
                "Name": "${{ env.BACKUP_DOMAIN }}",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                  {
                    "Value": "$VERCEL_DOMAIN"
                  }
                ]
              }
            }
          ]
        }
        EOF
        
        echo "Change batch for backup domain:"
        cat change-batch-backup.json
        
        # Apply the DNS change
        aws route53 change-resource-record-sets \
          --hosted-zone-id "$HOSTED_ZONE_ID" \
          --change-batch file://change-batch-backup.json
        
        echo "✅ Backup DNS record added successfully"

    - name: Add Custom Domains to Vercel Project
      run: |
        echo "Adding custom domains to Vercel project..."
        
        # Add primary domain
        curl -X POST "https://api.vercel.com/v9/projects/${{ secrets.VERCEL_PROJECT_ID }}/domains" \
          -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d "{\"name\": \"${{ env.PRIMARY_DOMAIN }}\"}" || echo "Primary domain might already exist"
        
        # Add backup domain
        curl -X POST "https://api.vercel.com/v9/projects/${{ secrets.VERCEL_PROJECT_ID }}/domains" \
          -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d "{\"name\": \"${{ env.BACKUP_DOMAIN }}\"}" || echo "Backup domain might already exist"
        
        echo "✅ Custom domains added to Vercel project"

    - name: Wait for DNS Propagation
      run: |
        echo "Waiting for DNS propagation..."
        sleep 60
        
        # Check if primary domain resolves
        for i in {1..5}; do
          if nslookup ${{ env.PRIMARY_DOMAIN }} > /dev/null 2>&1; then
            echo "✅ Primary domain ${{ env.PRIMARY_DOMAIN }} is resolving"
            break
          else
            echo "⏳ Waiting for primary domain to propagate... (attempt $i/5)"
            sleep 30
          fi
        done
        
        # Check if backup domain resolves
        for i in {1..5}; do
          if nslookup ${{ env.BACKUP_DOMAIN }} > /dev/null 2>&1; then
            echo "✅ Backup domain ${{ env.BACKUP_DOMAIN }} is resolving"
            break
          else
            echo "⏳ Waiting for backup domain to propagate... (attempt $i/5)"
            sleep 30
          fi
        done

    - name: Verify Deployment
      run: |
        echo "🚀 Deployment Summary:"
        echo "===================="
        echo "Vercel URL: ${{ steps.vercel-deploy.outputs.VERCEL_URL }}"
        echo "Primary Domain: https://${{ env.PRIMARY_DOMAIN }}"
        echo "Backup Domain: https://${{ env.BACKUP_DOMAIN }}"
        echo "Deployment ID: ${{ env.DEPLOYMENT_ID }}"
        echo "===================="
        
        # Test the deployment
        echo "Testing deployment accessibility..."
        
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${{ steps.vercel-deploy.outputs.VERCEL_URL }}" || echo "000")
        
        if [ "$HTTP_STATUS" -eq 200 ]; then
          echo "✅ Deployment is accessible and returning 200 OK"
        else
          echo "⚠️  Deployment returned HTTP status: $HTTP_STATUS"
        fi

    - name: Cleanup
      if: always()
      run: |
        echo "Cleaning up temporary files..."
        rm -rf target-repo
        rm -f change-batch-*.json
        echo "✅ Cleanup completed"

    - name: Notify Success
      if: success()
      run: |
        echo "🎉 Deployment completed successfully!"
        echo "Your application is now available at:"
        echo "- Primary: https://${{ env.PRIMARY_DOMAIN }}"
        echo "- Backup: https://${{ env.BACKUP_DOMAIN }}"
        echo "- Vercel: ${{ steps.vercel-deploy.outputs.VERCEL_URL }}"
```

Required GitHub Secrets:

Add these to your repository secrets:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

Required GitHub Variables:

Add these to your repository variables:

```
DOMAIN_PREFIX=your_domain_prefix
DOMAIN_BACKUP=your_backup_prefix
BASE_URL=https://your-app.com
TARGET_REPO_NAME=your-repo-name
AWS_REGION=us-east-1
```

API Call Examples:

Trigger via API (using repository_dispatch):

```
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/dispatches \
  -d '{
    "event_type": "deploy-with-domain",
    "client_payload": {
      "domain_prefix": "app1",
      "domain_backup": "app1-backup", 
      "base_url": "https://app1.ega-tech.co.uk"
    }
  }'
```

Trigger manually via GitHub UI:

You can also trigger this workflow manually through the GitHub Actions tab with custom inputs.

Key Features:

API Triggerable: Uses repository_dispatch for API calls
Repository Cloning: Clones from certifi-world organization
Environment File: Creates .env with all specified variables
Vercel Deployment: Full deployment pipeline with custom domains
Route53 DNS: Automatically adds both primary and backup DNS records
Error Handling: Comprehensive error checking and cleanup
Verification: Tests deployment accessibility
Flexible: Supports both API and manual triggering

The action will create domains like:

app1.ega-tech.co.uk (primary)
app1-backup.ega-tech.co.uk (backup)

Both pointing to your Vercel deployment.
