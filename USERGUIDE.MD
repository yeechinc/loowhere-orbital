# LooWhere User Guide

## Prerequisites
1. **Expo Go** — download from the App Store (iOS) or Google Play (Android)
2. **Node.js** — download from `nodejs.org` (LTS version)

---

## Setup Instructions

**1. Unzip the project folder**

Unzip `loowhere-orbital.zip` and open Terminal.

**2. Navigate into the project folder**
cd loowhere-orbital

**3. Install dependencies**
npm install --legacy-peer-deps

**4. Create the Supabase config file**

Create a new file called `supabaseConfig.js` in the root of the project folder and paste the following:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zdtqiwvxhudmhxbfowbt.supabase.co'
const supabaseKey = 'sb_publishable_muGpzbhl7vVWOO3mXeDQzw_9oIznt-g'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**5. Start the app**
npx expo start -c

**6. Open on your phone**
- Download **Expo Go** on your phone
- Make sure your phone and laptop are on the same WiFi
- Scan the QR code shown in the terminal with Expo Go

---

## Using the App

**Register an account**
- On the login screen, tap **Register**
- Enter your email and password
- You'll be assigned a random display name like `LooSeeker1234`

**Exploring the map**
- After logging in, you'll see a map of Singapore with 720 real toilet locations
- **Blue pins** = toilets with bidets
- **Red pins** = toilets without bidets
- Use the filter chips at the top to filter by **Bidet**, **Handicap**, or **Paper**

**Viewing a toilet**
- Tap any pin to open the toilet detail card at the bottom
- View the toilet name, address, facilities, and average rating
- Tap the star rating to open the full reviews page

**Leaving a review**
- On the reviews page, select a star rating and write a comment
- Tap **Submit Review** to post your review

**Profile**
- Tap the **Profile** tab at the bottom right
- View your display name, email, and number of loos reviewed
- Tap **⚙️** to open settings — change your display name or log out

---

## Notes
- The app requires an internet connection to load toilet data and reviews
- All data is stored in a shared Supabase database so reviews are visible to all users

---

*Made with 🚽 by Team Bidet Buddies — NUS Orbital 2026*