# BFP Emergency System — System Flow Guide

> Written so simply that even a 7-year-old can understand how the whole system works.

---

## What Is This System?

Imagine there's a fire in your neighborhood. You need to call the fire station for help. This system is like a super-smart phone that:

1. Lets you call for help from your phone
2. Finds the closest fire station that is ready
3. Sends a firetruck to your location
4. Lets the fire station watch the firetruck on a map
5. Tells everyone how big the fire is getting

There are **5 apps** that all talk to each other:

| App | Who Uses It | What It Does |
|-----|-------------|-------------|
| **End-User Mobile App** | Regular people (civilians) | Call for help when there's a fire |
| **BFP Admin Dashboard** | Main fire station boss | Sees ALL emergencies, coordinates everything |
| **Substation Admin Dashboard** | Branch fire station boss | Sees emergencies assigned to their station |
| **Firetruck Mobile App** | Firetruck driver | Updates fire status and alarm level from the scene |
| **Backend Server** | The computer brain | Connects everything together |

---

## Flow 1: "There's a Fire! I Need Help!" (Civilian Calls)

Here's what happens step by step when someone sees a fire:

```
👤 Civilian opens the app on their phone
    │
    ▼
📱 Taps "EMERGENCY CALL" button
    │
    ├── Phone sends: location (GPS), phone number, what's happening
    │
    ▼
🖥️ Backend Server receives the call
    │
    ├── Creates an "alarm" record in the database (like writing it in a notebook)
    │
    ├── Looks at ALL fire stations and asks:
    │     "Which station is READY and ONLINE and CLOSEST?"
    │     (Uses math to measure distance — like measuring with a really long ruler)
    │
    ▼
🏢 Closest fire station gets a pop-up: "INCOMING EMERGENCY!"
    │
    ├── The pop-up shows: who's calling, where the fire is, what type of fire
    │
    ├── Station admin has 20 seconds to click "Accept" or "Dismiss"
    │
    ▼
    ├── IF they click "Accept" ✅
    │     → The station is now in charge of this fire
    │     → The civilian hears "Your call was accepted!"
    │     → A voice call connects (like a phone call) so they can talk
    │
    ├── IF they click "Dismiss" ❌ or don't answer in 20 seconds ⏰
    │     → Backend says "OK, let me try the NEXT closest station"
    │     → That station gets the pop-up now
    │     → This keeps going until someone accepts
    │
    └── IF nobody accepts at all 😰
          → The MAIN fire station boss (BFP Admin) gets it as a last resort
```

**Think of it like this:** You're playing a game of hot potato. The emergency goes to the closest station first. If they don't grab it, it goes to the next one, and the next one, until someone catches it. The main boss is always the backup catcher.

---

## Flow 2: "Send the Firetruck!" (Dispatch & Tracking)

After a station accepts the emergency:

```
🏢 Station admin assigns a firetruck
    │
    ▼
🚒 Firetruck driver's phone buzzes: "NEW DISPATCH!"
    │
    ├── Shows them: WHERE to go (address + GPS), WHAT happened
    │
    ▼
🚒 Driver taps "En Route" (meaning: "I'm on my way!")
    │
    ├── Phone starts sending GPS location every 5 seconds
    │     (Like leaving breadcrumbs so everyone knows where the truck is)
    │
    ├── Admin dashboard shows a little truck icon moving on the map 🗺️
    │
    ▼
🚒 Driver arrives and taps "On Scene" (meaning: "I'm here!")
    │
    ├── Admin dashboard updates: "Truck #1 is at the fire"
    │
    ▼
🚒 When fire is out, driver taps "Fire Out" ✅
    │
    ├── Admin sees: "Fire is out! Truck #1 is done."
    │
    └── Driver can tap "End Mission" to go back to Standby
```

**Think of it like this:** The firetruck driver is like a pizza delivery driver. The app tracks where they are so the fire station knows exactly when help will arrive.

---

## Flow 3: "The Fire Is Getting Bigger!" (Alarm Escalation)

Fires have different sizes, just like T-shirt sizes (Small, Medium, Large, Extra Large):

| Alarm Level | What It Means | Color |
|------------|--------------|-------|
| 🟡 **1st Alarm** | Small fire — one truck can handle it | Yellow |
| 🟠 **2nd Alarm** | Medium fire — need more help | Orange |
| 🟤 **3rd Alarm** | Big fire — send more trucks | Deep Orange |
| 🔴 **4th Alarm** | Very big fire — lots of trucks needed | Red |
| 🔴 **5th Alarm** | Huge fire — all hands on deck | Dark Red |
| 🟣 **Task Force Alpha/Bravo/Delta** | Special operations | Purple |
| ⚫ **General Alarm** | BIGGEST POSSIBLE — every station responds | Black |

Here's what happens when the fire gets bigger:

```
🚒 Driver at the fire scene sees the fire is spreading
    │
    ▼
📱 Driver taps "2nd Alarm" on their phone (was "1st Alarm" before)
    │
    ├── Phone sends the change to the backend server
    │
    ▼
🖥️ Backend Server:
    │
    ├── Saves the new alarm level in the database
    │
    ├── Checks: "Did the alarm level actually change?"
    │     YES → Sends a special "ALARM ESCALATED" message to everyone
    │
    ▼
🔔 ALL admin dashboards get a notification:
    │
    ├── Bell icon shows a red dot (new notification!)
    │
    ├── Toast message pops up:
    │     "🚨 ALARM ESCALATED: 1st Alarm → 2nd Alarm | Truck #1 (Juan Dela Cruz)"
    │
    ├── It's "sticky" — won't disappear until you click it
    │
    └── Has a "View Incident" button to see details
```

**Think of it like this:** Imagine you're playing with building blocks and the tower keeps falling and getting bigger. Every time it gets bigger, you shout louder so more friends come to help. The alarm level is how loud you're shouting.

---

## Flow 4: "Let Me Sign Up / Log In" (Authentication)

### Civilian (End-User App):

```
👤 New user opens the app
    │
    ├── Taps "Sign Up"
    │
    ├── Fills in: Name, Phone Number (or Email), Password
    │
    ▼
🖥️ Backend creates the account
    │
    ├── Sends a 6-digit code via SMS (or email)
    │     (Like a secret password only you know)
    │
    ▼
📱 User types the 6-digit code
    │
    ├── Backend checks: "Is this the right code?"
    │     YES → Account is verified! ✅
    │     NO → "Wrong code, try again" ❌
    │
    ▼
📱 User can now log in and call for help
```

### Admin / Substation:

```
👨‍🚒 Fire station officer opens dashboard in web browser
    │
    ├── Types their ID number and password
    │
    ▼
🖥️ Backend checks the password
    │
    ├── Gives them a "token" (like a wristband at a theme park)
    │     This wristband lets them do admin stuff
    │
    ▼
🖥️ Dashboard loads with live data
    │
    ├── Socket.IO connects (like an always-on walkie-talkie)
    │
    └── They can now receive emergencies and manage incidents
```

---

## Flow 5: "Where Is Everything?" (The Map)

The admin dashboard has a big map that shows:

```
🗺️ The Map
    │
    ├── 📍 Red pulsing dot = Where the emergency is (caller's location)
    │
    ├── 🚒 Firetruck icon = Where each firetruck is right now
    │     (Updates every 5 seconds)
    │
    └── 🏢 Fire station markers = Where each station is located
```

The map gets its data two ways:

1. **Fast way (Socket.IO):** The firetruck driver's phone sends location through the "walkie-talkie" — shows up instantly
2. **Safe way (REST API):** The dashboard also asks the database "where are all the trucks?" every 5 seconds — backup in case the walkie-talkie has issues

---

## How All 5 Apps Connect (The Big Picture)

```
                    ┌──────────────────────┐
                    │  ☁️ Cloudflare Tunnel │
                    │  (Makes local server  │
                    │   available online)    │
                    └──────────┬───────────┘
                               │
     ┌─────────────────────────┼─────────────────────────┐
     │                         │                         │
     ▼                         ▼                         ▼
┌─────────┐            ┌─────────────┐            ┌──────────┐
│ 📱      │            │ 🖥️ Backend  │            │ 📱       │
│ Civilian│◄──────────►│ Server      │◄──────────►│ Firetruck│
│ App     │  HTTP +    │ (Node.js)   │  HTTP +    │ App      │
│         │  Socket.IO │             │  Socket.IO │          │
└─────────┘            │  Port 5000  │            └──────────┘
                       └──────┬──────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ 🌐       │   │ 🗄️       │   │ 📞       │
        │ BFP Admin│   │ Supabase │   │ Twilio   │
        │ Dashboard│   │ Database │   │ (SMS +   │
        │ (:5173)  │   │ (Cloud)  │   │  Voice)  │
        └──────────┘   └──────────┘   └──────────┘
              │
              ▼
        ┌──────────┐
        │ 🌐       │
        │Substation│
        │Dashboard │
        │ (:5174)  │
        └──────────┘
```

**Think of it like this:** The Backend Server is like a school principal. All the students (apps) talk to the principal, and the principal tells the right people what's happening. The principal uses a notebook (Supabase database) to remember everything, a phone system (Twilio) to make calls, and a tunnel (Cloudflare) so people outside the school can reach them too.

---

## Quick Summary

| When This Happens... | This Is What The System Does... |
|---|---|
| Someone sees a fire | Civilian app sends emergency to backend → finds nearest station → pops up on their screen |
| Station accepts | Voice call connects + firetruck gets dispatched |
| Nobody accepts in 20 seconds | Backend tries the next closest station |
| Firetruck leaves the station | GPS tracking starts, truck appears on the map |
| Fire gets bigger | Driver escalates alarm → ALL admins get a loud notification |
| Fire is put out | Driver marks "Fire Out" → incident resolved |
