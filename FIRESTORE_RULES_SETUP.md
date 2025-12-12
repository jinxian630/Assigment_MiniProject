# Firestore Security Rules Setup Guide

## Problem
You're getting "Missing or insufficient permissions" error when trying to publish memories.

## Solution
Update your Firestore security rules in Firebase Console.

## Step-by-Step Instructions

### Option 1: Update Rules in Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project: `myminiprojectnkk`

2. **Navigate to Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Click on the "Rules" tab at the top

3. **Copy and Paste the Rules**
   - Open the `firestore.rules` file in this project
   - Copy ALL the content
   - Paste it into the Firebase Console Rules editor
   - Click "Publish" button

4. **Wait for Rules to Deploy**
   - Rules usually deploy within a few seconds
   - You'll see a success message

### Option 2: Using Firebase CLI (Advanced)

If you have Firebase CLI installed:

```bash
firebase deploy --only firestore:rules
```

## What These Rules Allow

✅ **Authenticated users can:**
- Read all memory posts
- Create memory posts (must set their own userId)
- Update/delete their own memory posts
- Comment on any memory post
- Save/unsave memory posts
- Read/write their own user profile

❌ **Unauthenticated users:**
- Cannot access any data

## Testing

After updating the rules, try publishing a memory again. The error should be gone!

## Troubleshooting

If you still get permission errors:
1. Make sure you're logged in
2. Check that the rules were published successfully
3. Wait a few seconds for rules to propagate
4. Check the browser console for any other errors

