## Doskara dynos application hosts

This document contains information on the hosts that run doskara applications.  Following Heroku's convention, we refer to hosts as "dynos", even though Heroku runs multiple dynos on a single host.

### Watching for idle applications

Using iptables, we can log IP packets that match specific rules.  This allows us to read the log to determine how long a the network has been idle for a specific service.  Here is an example iptables command that enables logging all packets destined for tcp port 80:

    $ sudo iptables -A INPUT -p tcp --dport 80 -j LOG

The logging is done via the syslog facility, so you can look for logs in `/var/log/syslog` or use the `dmesg` command to print out kernel logs.

To make it easier to find the relevant packets, we will make a few changes:
 * limit logging rate to avoid flooding the log
 * add an arbitrary string to the log to make it easy to find the relevant packets

Here is an iptables command that will add the string `DOSKARA-APP-REQUEST` and limit logging to a rate of 5 log entries per minute to all tcp requests on port 80:

    $ sudo iptables -A INPUT -p tcp --dport 80 -j LOG --log-prefix="DOSKARA-APP-REQUEST" -m limit --limit 5/m

Here is a command that will print out the most recent request that has been logged with the string `DOSKARA-APP-REQUEST`:

    $ sudo grep "DOSKARA-APP-REQUEST" /var/log/syslog | tail -n 1
    Mar 31 22:39:05 localhost kernel: [20014139.397853] DOSKARA-APP-REQUESTIN=lo OUT= MAC=00:00:00:00:00:00:00:00:00:00:00:00:08:00 SRC=127.0.0.1 DST=127.0.0.1 LEN=52 TOS=0x00 PREC=0x00 TTL=64 ID=13616 DF PROTO=TCP SPT=57231 DPT=12345 WINDOW=342 RES=0x00 ACK URGP=0

We can use the timestamp at the start of the log entry in order to determine how long the network has been idle.  In conjunction with a cronjob, we can use this information to shut down the application when it's been idle for too long.
