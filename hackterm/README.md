# HACKTERM

A browser-based terminal hacking incremental game. Inspired by Hacknet.

> **This is a work of fiction for entertainment purposes only.**
> All corporations, governments, persons, IP addresses, vulnerabilities, and
> events depicted are entirely fictional. Any resemblance to real organizations,
> systems, or security incidents is coincidental. This game does not provide
> instructions for real-world hacking and is not intended to encourage or
> facilitate unauthorized access to computer systems.

---

## Gameplay

You start with a terminal and $50. Scan networks, exploit vulnerabilities,
install backdoors for passive income, and manage your heat level before the
FBI closes in. Prestige at the end of each run for permanent bonuses.

### Core loop

```
nmap 10.0.1.0/24          discover nearby hosts
probe <ip>                 scan a host for vulnerabilities
exploit <ip> -v <vuln_id>  run a timed exploit
exploit <ip> -z            instant exploit using a zero-day from inventory
connect <ip>               open a shell on a compromised host
backdoor                   install a persistent income listener
exfiltrate                 dump data for a one-time payout
clearlog                   reduce heat by wiping traces
disconnect                 close the current shell
```

### Prestige endings

| Ending | Trigger | Bonus |
|---|---|---|
| **Legend** | Earn $25,000+ then `retire` | +0.5× income multiplier |
| **FBI** | Heat reaches 100% | +1 clearance level (free starting upgrade) |
| **Counter-hacked** | Rival operator owns you | 15% of final money retained |

### Market

```
market list                browse zero-days and crew bots
market buy <id>            purchase an item
market inv                 view your inventory and active crew
market fire <id>           dismiss a crew member
```

---

## Development

```bash
npm install
npm run dev
npm run build
```

Built with React + TypeScript + Vite + Zustand + Tailwind CSS.
