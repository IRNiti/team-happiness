const { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: 'BOT_TOKEN',
  signingSecret: 'SIGNING_SECRET',
  socketMode: true,
  appToken: 'APP_TOKEN',
  port: process.env.PORT || 3000
});

// channel IDs for getting team membership and posting automated messages
const teamSyncChannel = 'C030RNQBFU2';
const birthdayChannel = 'C030S0EAJ83';

// Listens to incoming messages that contain "happiness"
app.message('happiness', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hey there <@${message.user}>!`
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Click Me"
          },
          "action_id": "button_click"
        }
      }
    ],
    text: `Hey there <@${message.user}>!`
  });
});

// listens to button click from user and responds
app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

// listens to birthday entered by user in slack channel and stores it in csv
app.action('birthday_entered', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  writeToCSV(body.user.id, body.actions[0].selected_date);
});

// listens to user joining a slack channel and performs action depending on which channel was joined
// in order for this event to be triggered, the bot app has to be added to the slack channel
app.event('member_joined_channel', async ({ event, client, logger }) => {
  try {
    // Call chat.postMessage with the built-in client to welcome user to channel
    if(event.channel == teamSyncChannel){
      const result = await client.chat.postMessage({
        channel: teamSyncChannel,
        text: `Welcome to team happiness, <@${event.user}>! 🎉 You will now get randomly paired with other members for 1-1s.`
      });
    }

    // post message asking user to enter their birthday
    if(event.channel == birthdayChannel){
      const result = await client.chat.postMessage({
        channel: birthdayChannel,
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `Hey there <@${event.user}>! Please let us know when your birthday is so we can properly celebrate you!`
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "datepicker",
                "initial_date": "1990-04-28",
                "placeholder": {
                  "type": "plain_text",
                  "text": "Select a date",
                  "emoji": true
                },
                "action_id": "birthday_entered"
              }
            ]
          },
        ]
      });
      logger.info(result);
    }
  }
  catch (error) {
    logger.error(error);
  }
});

// return pairs of randomized users for 1-1s
const randomizeUsers = async (client) => {
  // bot user id which does not need to be matched
  const excludedUser = 'U030586D2A3';
  // get list of users members of channel
  const users = await client.conversations.members({
    channel: teamSyncChannel
  })
  //remove bot user from list of channel users
  users.members.splice(users.members.indexOf(excludedUser), 1);
  let randomizedUsers = [];

  while(users.members.length > 0){
    if(randomizedUsers.length > 0 && randomizedUsers[randomizedUsers.length - 1].length == 1){
      randomizedUsers[randomizedUsers.length - 1].push(users.members.splice(getRandomInt(users.members.length), 1)[0]);
    } else {
      randomizedUsers.push(users.members.splice(getRandomInt(users.members.length), 1));
    }
  }
  return randomizedUsers;
}

// create conversation with matched users and schedule message to invite them to meet
// scheduleMessage is used instead of postMessage due to usage limitations for postMessage API
const matchUsers = async (client) => {
  const randomizedUsers = await randomizeUsers(client);
  for(let matchedUsers of randomizedUsers){
    try{
      const response = await client.conversations.open({
        users: matchedUsers[0]+','+matchedUsers[1]
      })

      if(response.ok){
        const timestamp = Math.floor(Date.now() / 1000) + 10;
        const response2 = await client.chat.scheduleMessage({
          channel: response.channel.id,
          post_at: timestamp,
          text: `Hi <@${matchedUsers[0]}> and <@${matchedUsers[1]}>! You have been matched for a 1-1. 🎉 Please schedule some time to connect this week.`
        })
      }
    } catch(error) {
      console.log(error);
    }
  }
}

const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
}

const writeToCSV = (userId, birthdate) => {
  const createCsvWriter = require('csv-writer').createObjectCsvWriter;
  const csvWriter = createCsvWriter({
    path: 'birthdays.csv',
    header: [
      {id: 'id', title: 'ID'},
      {id: 'birthday', title: 'Birthday'}
    ],
    append: true
  });

  const data = [
    {
      id: userId,
      birthday: birthdate,
    }
  ];

  csvWriter
    .writeRecords(data)
    .then(()=> console.log('The CSV file was written successfully'));
}

(async () => {
  // Start your app
  await app.start();
  
  console.log('⚡️ Bolt app is running!');
  try{
    matchUsers(app.client);
  } catch(error){
    console.log(error);
  }
})();