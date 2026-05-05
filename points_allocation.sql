# Signing up: 10 points

user_id=
award_id=

select count(userid) from logins where user_id = \'$user_id\'

# Updating your profile with photo: 5 points

select count(userid) from displaypics where user_id = ''

# Unlocking drops/downloading pass: 10 points

select distinct(user_id) from wallet_passes where user_id = '' and award_id = ''

# Checking in physically: 20 points

select count(userid) from logins

# Uploading drop memories: 5 points

select count(userid) from gallery where user_id = ''

# Streaks; multiple drops in 1 week: 15 points

select count(userid) from logins

# TBC

# Referring friends: 10 points

select count(userid) from logins
