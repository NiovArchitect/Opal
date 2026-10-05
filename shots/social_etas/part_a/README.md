# Part A — Chat list plan pills

Founder screenshot A: search + conversation rows with cyan connection labels and colored plan pills.

## Evidence

- `01_chats_list.png` — five fixture rows with dinner (yellow), activity (purple), live (red), trip (purple) pills
- `02_pill_opens_plan.png` — pill tap opens graph detail (not chat thread)
- `VERIFY.json` — automated pass (`pass: true`)

## VERIFY

- 5 pills: dinner, activity, dinner, live, trip
- Connections: Direct connection / 4 people · Group / Following + connected
- Pill click → chatThread count 0, Juniper graph detail visible
