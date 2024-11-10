const post = async (url, body) => {
   try {
       const request = await fetch(`https://${url}`, {
           method: 'POST',
           body,
           headers: {
               'Content-Type': 'application/json',
           },
       });

       if (!request.ok) throw new Error('Request failed');

       return await request.json(); // Return the JSON response of the target URL posted
   } catch (error) {
       await sleep(0.2); // Sleep 2 seconds and try again due to error
       return await post(url, body); // Re-call the post function
   }
};

const get = async (url, includeCreds = false) => {
   await sleep(3)
   try {
       creds = 'omit'; // Default for no credentials included
       if (includeCreds) creds = 'include';
            const request = await fetch(`https://${url}`, {
                credentials: creds
       });
       if (!request.ok) throw new Error('Request failed'); 

       return await request.json(); // Return the JSON response of the target URL posted
   } catch (error) {
       await sleep(3); // Sleep 2 seconds and try again due to error
       return await get(url, includeCreds); // Re-call the get function
   }
};

async function scan_username(input) {
   let data = {
       "usernames": [
           input // This is the username that the RoSearcher user typed into the search box
       ],
       "excludeBannedUsers": true // Exclude banned Roblox users from showing on the results
   };

   try {
       const response = await post('users.roblox.com/v1/usernames/users', JSON.stringify(data)); // Fetch the details of the target username provided
       if (response.data.length === 0) {
           return false;
       } else {
           let userData = response.data[0];
           let username = userData.name;
           let user_id = userData.id;
           return [username, user_id]; // Return the username and user ID of the target user
       }
   } catch (error) {
       return false; // Error when trying to retrieve the user
   }
}

var place_id = window.location.href.match(/games\/(\d+)\//);
if (place_id) {
   place_id = place_id[1]; // Get the place ID from the window location URL
}

// RoSearcher element styling, positioning, and sizing
const main_Servers_panel = document.getElementById('running-game-instances-container'); 
const private_server_btn = document.createElement('button');
const image_container = document.createElement('div');
const imageLabel = document.createElement('img');
private_server_btn.setAttribute('type', 'button');
private_server_btn.classList.add('btn-more', 'btn', 'btn-secondary-md', 'btn-min-width');
private_server_btn.innerText = 'Find User with RoSearcher';
private_server_btn.style.width = '180px'
private_server_btn.style.height = '30px';
private_server_btn.style.zIndex = '2';
private_server_btn.style.padding = '0';
private_server_btn.style.textAlign = 'center';
private_server_btn.style.lineHeight = '20px';
image_container.style.display = 'inline-flex';
image_container.style.alignItems = 'center';
imageLabel.src = chrome.runtime.getURL('images/logo.png');
imageLabel.style.marginLeft = '2px';
imageLabel.style.height = '50px';
imageLabel.style.width = 'auto';
imageLabel.style.zIndex = '0';

// Variables for RoSearcher usage and searching
let Avatar_Type = 'AvatarHeadshot';
let Avatar_Size = '150x150'
let foundAllServers = false;
let allPlayers = [];
let playersCount = 0;
let playersChecked = 0;
let maxPlayers = 0;
let maxServersPerPage = 10;
let maxPages = 1;
let page = 1;
let playerImageUrl;
let playerUrlReady = false;
let search_type = 'static';
let player_found = false;
let unique_jobid;
let totalServersChecked = []
const serverIds = new Set();
const friendServers = new Map();
const allThumbnails = new Map();
const sleep = time => new Promise(res => setTimeout(res, time * 1000));
const style = document.createElement('style');
style.innerHTML = `
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
let targetServerIds = {
   serverId: "",
   serverSize: 0
};


function rotateAnimation(element, isActive) {
   // Rotate the loading (buffering) image when searching for someone with RoSearcher
   if (isActive) {
       element.style.animation = "rotate 1s linear infinite"; 
   } else {
       element.style.animation = "";
   }
}

async function search_frame(title, field_input) {
   // This entire function is for the popup after clicking the "Find User with RoSearcher" button
   const modalBackdrop = document.createElement('div');
   const modalContainer = document.createElement('div');
   modalBackdrop.className = 'modal-backdrop in';
   modalBackdrop.setAttribute('role', 'dialog');
   modalContainer.id = 'purchase-private-server-modal';
   modalContainer.className = 'in modal';
   modalContainer.style.display = 'block';
   modalContainer.setAttribute('role', 'dialog');
   modalContainer.setAttribute('tabindex', '-1');
   const modalWindow = document.createElement('div');
   modalWindow.className = 'modal-window modal-sm modal-dialog';
   const modalContent = document.createElement('div');
   modalContent.className = 'modal-content';
   modalContent.setAttribute('role', 'document');
   const modalHeader = document.createElement('div');
   modalHeader.className = 'modal-header';
   const closeButton = document.createElement('button');
   closeButton.className = 'close';
   closeButton.setAttribute('type', 'button');
   closeButton.setAttribute('title', 'close');
   const closeIcon = document.createElement('span');
   closeIcon.className = 'icon-close';
   closeButton.appendChild(closeIcon);

   function close_prompt() {
       modalContainer.remove();
       modalBackdrop.remove();
       search_type = 'static';
   }

   closeButton.addEventListener('click', function() {
       close_prompt(); // Close the RoSearcher prompt after they click the X at the top
   })

   const modalTitle = document.createElement('h4');
   modalTitle.className = 'modal-title';
   modalTitle.textContent = title;
   modalHeader.appendChild(closeButton);
   modalHeader.appendChild(modalTitle);
   const modalBody = document.createElement('div');
   modalBody.className = 'modal-body';
   const privateServerPurchase = document.createElement('div');
   privateServerPurchase.className = 'private-server-purchase';
   const search_status_label = document.createElement('div');
   search_status_label.className = 'status-label';
   search_status_label.style.cssText = `
      text-align: center;
      width: 100%;
      padding: 10px 0;
      display: none;
      font-size: 16px;
      color: #333;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  `;
   search_status_label.innerText = '';
   const modalListItem = document.createElement('div');
   modalListItem.className = 'modal-list-item';
   const privateServerNameInput = document.createElement('div');
   privateServerNameInput.className = 'modal-list-item private-server-name-input';
   const textLabel = document.createElement('span');
   textLabel.className = 'text-label';
   textLabel.textContent = 'Username:';
   const formGroup = document.createElement('div');
   formGroup.className = 'form-group form-has-feedback';
   const inputField = document.createElement('input');
   inputField.type = 'text';
   inputField.maxLength = 50;
   inputField.className = 'form-control input-field private-server-name';
   inputField.id = 'private-server-name-text-box';
   inputField.value = field_input;
   const modalImageContainer = document.createElement('div');
   modalImageContainer.className = 'modal-image-container';
   modalImageContainer.style.display = 'none';
   const thumbnailContainer = document.createElement('span');
   thumbnailContainer.className = 'thumbnail-2d-container modal-thumb';
   thumbnailContainer.style.backgroundColor = 'transparent';
   const originalImage = document.createElement('img');
   originalImage.className = 'original-image';
   originalImage.src = '';
   originalImage.alt = '';
   originalImage.title = '';
   thumbnailContainer.appendChild(originalImage);
   modalImageContainer.appendChild(thumbnailContainer);
   const findButton = document.createElement('button');
   findButton.type = 'button';
   findButton.textContent = 'Find';
   findButton.className = 'modal-button disabled btn-primary-md btn-min-width';
   const findLink = document.createElement('a');
   findLink.style.display = 'none';
   findLink.innerHTML = `<br><a href="https://rofinder.io" target="_blank">Give us a 5 star review!</a>` // Make sure to give us a 5 star review!
   let type_animation_interval;

   function stopSearch() {
       clearInterval(type_animation_interval);
       findButton.innerHTML = "Find";
       findButton.disabled = false;
   }

   function startSearch() {
       findButton.disabled = true;
       let dots = 0;
       findButton.innerHTML = "Searching.";

       type_animation_interval = setInterval(() => {
           dots = (dots + 1) % 4;
           findButton.innerHTML = "Searching" + ".".repeat(dots);
       }, 500);

   }

   var nullg = []

   async function success_scan_apperance() {
       // Change the prompt to success with the Join button after finding the target user

       stopSearch();
       rotateAnimation(modalImageContainer, false);
       modalTitle.textContent = 'User Successfully Found ✅';
       totalServersChecked.length = 0
       originalImage.src = playerImageUrl;
       inputField.disabled = false
       findButton.innerText = 'Join';
       findButton.className = 'btn-common-play-game-lg btn-primary-md btn-full-width';
       findButton.onclick = () => chrome.runtime.sendMessage({
           message: {
               place: String(place_id),
               id: String(unique_jobid)
           }
       });

       findLink.style.display = 'block';
       search_type = 'succeed';
   }

   async function failed_scan_apperance() {
       // Change the prompt to failed with "User Not Found" after failing to find the target user

       stopSearch();
       rotateAnimation(modalImageContainer, false);
       modalTitle.textContent = 'User Not Found';
       totalServersChecked.length = 0
       modalImageContainer.style.display = 'none';
       originalImage.src = ''
       inputField.disabled = false
       findButton.innerText = 'Try again';
       search_type = 'retry';
       search_status_label.style.display = 'block'
       search_status_label.innerText = 'We could not find your desired user after scanning the servers'
   }

   inputField.addEventListener('input', async () => {
       // Every time they adjust the username, it will check if the username is valid or not

       let button_visible = false
       let username_arrays = await scan_username(inputField.value);

       if (username_arrays) {
           button_visible = true
       } else {
           button_visible = false;
       }

       if (button_visible) {
           findButton.className = 'modal-button enabled btn-primary-md btn-min-width';
       } else {
           findButton.className = 'modal-button disabled btn-primary-md btn-min-width';
       }
   });

   findButton.addEventListener('click', async function() {
       // Initiate the player finding after they click "Find"

       if (search_type == 'retry') {
           search_type = 'static';
           findButton.innerHTML = 'Find';
           search_status_label.style.display = 'none';
           modalTitle.textContent = 'Search For Player In-Game';
       } else if (search_type == 'static') {
           const input_value = inputField.value.toString();
           const username_arrays = await scan_username(input_value);
           modalTitle.textContent = 'Scanning Servers';
           modalImageContainer.style = 'block';
           inputField.disabled = true;
           originalImage.src = chrome.runtime.getURL('images/loading.png');
           rotateAnimation(modalImageContainer, true);
           await updateUser(username_arrays);
           await searchServers();

       } else if (search_type == 'succeed') {
           findButton.className = 'modal-button enabled btn-primary-md btn-min-width';
           close_prompt();
       }
   });

   formGroup.appendChild(inputField);
   privateServerNameInput.appendChild(textLabel);
   privateServerNameInput.appendChild(formGroup);
   privateServerPurchase.appendChild(modalListItem);
   privateServerPurchase.insertBefore(privateServerNameInput, privateServerPurchase.firstChild);
   privateServerPurchase.appendChild(modalImageContainer);
   modalBody.appendChild(privateServerPurchase);
   privateServerPurchase.appendChild(search_status_label);
   const modalFooter = document.createElement('div');
   modalFooter.className = 'modal-footer';
   const loadingDiv = document.createElement('div');
   loadingDiv.className = 'loading';
   const modalButtons = document.createElement('div');
   modalButtons.className = 'modal-buttons';
   modalButtons.appendChild(findButton);
   modalButtons.appendChild(findLink);
   modalFooter.appendChild(loadingDiv);
   modalFooter.appendChild(modalButtons);
   modalContent.appendChild(modalHeader);
   modalContent.appendChild(modalBody);
   modalContent.appendChild(modalFooter);
   modalWindow.appendChild(modalContent);
   modalContainer.appendChild(modalWindow);
   document.body.appendChild(modalBackdrop);
   document.body.appendChild(modalContainer);
   async function updateUser(user_details) {
       try {
           const user_id = user_details[1]
           const {
               data: [{
                   imageUrl
               }]
           } = await get(`thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user_id}&size=150x150&format=Png&isCircular=false`);
           if (imageUrl.includes('https://tr.rbxcdn.com')) {
               playerImageUrl = imageUrl;
               playerUrlReady = true;
           } else findButton.innerText = 'User thumbnail is a common error thumbnail, unable to find user';
       } catch (error) {
           playerUrlReady = true;
       }
   }

   async function fetchServers(pass = 1, cursor = '', attempts = 0) {
       document.getElementsByClassName('modal-title')[1].innerText = `Scanning Servers (Checked ${totalServersChecked.length})`
       if (nullg.length > 0) {
         return
       } else {
         const response = await get(`games.roblox.com/v1/games/${place_id}/servers/Public?limit=100&cursor=${cursor}`);
         const {
            nextPageCursor,
            data
         } = response;

         if (attempts >= 1) return;

         if (!data || data.length === 0) {
            if (!nextPageCursor) return;
            return fetchServers(pass, cursor, attempts + 1);
         }

         data.forEach((server) => {
            totalServersChecked.push('server')
            if (!serverIds.has(server.id))
                  server.playerTokens.forEach((playerToken) => {
                     serverIds.add(server.id);
                     playersCount += 1;
                     allPlayers.push({
                        token: playerToken,
                        type: Avatar_Type,
                        size: Avatar_Size,
                        requestId: server.id,
                     });
                  });
            maxPlayers = server.maxPlayers;
         });


         if (nextPageCursor == null){
            nullg.push('true')
            return
         }
         if (!nextPageCursor) return;
         return fetchServers(pass, nextPageCursor);
      }
   }

   async function findTarget() {
       while (true) {
           const chosenPlayers = [];

           for (let i = 0; i < 100; i++) {
               const playerToken = allPlayers.shift();
               if (!playerToken) break;
               chosenPlayers.push(playerToken);
           }

           if (!chosenPlayers.length) {
               if (playersChecked === playersCount && foundAllServers) {
                   break;
               }
               await sleep(0.1);
               continue;
           }

           post('thumbnails.roblox.com/v1/batch', JSON.stringify(chosenPlayers)).then(({
               data: thumbnailsData
           }) => {

               thumbnailsData.forEach((thumbnailData) => {
                   const thumbnails = allThumbnails.get(thumbnailData.requestId) || [];
                   if (thumbnails.length == 0) {
                       allThumbnails.set(thumbnailData.requestId, thumbnails);
                   }

                   playersChecked += 1;
                   thumbnails.push(thumbnailData.imageUrl);
                   let containsId = false;
                   targetServerIds.forEach((targetServerId) => {
                       if (targetServerId.serverId == thumbnailData.requestId) containsId = true;
                   });

                   if (!containsId) targetServerIds.push({
                       serverId: thumbnailData.requestId
                   });
               });
           });
       }
       targetServerIds.forEach((targetServerId) => {
           targetServerId.serverSize = allThumbnails.get(targetServerId.serverId).length;
       });
       if (targetServerIds.length) {
           targetServerIds.forEach(targetServerId => {
               const thumbnails = allThumbnails.get(targetServerId.serverId);
               thumbnails.reverse();
           });
           preLoadServers();
       }
   }

   async function preLoadServers() {
       targetServerIds.sort((a, b) => {
           return b.serverSize - a.serverSize;
       });
       maxPages = 1;
       let serverCount = targetServerIds.length;
       while (serverCount > maxServersPerPage) {
           maxPages += 1;
           serverCount -= maxServersPerPage;
       }
       while (!playerUrlReady) {
           await sleep(.1);
       }

       for (let i = 0; i < targetServerIds.length; i++) {
           const thumbnails = allThumbnails.get(targetServerIds[i].serverId);
           for (let j = 0; j < thumbnails.length; j++) {
               if (thumbnails[j] === playerImageUrl ? thumbnails[j] : null) {
                   player_found = true
                   const server_id_generation = targetServerIds[i].serverId
                   let serverCount = i + 1;
                   while (serverCount > maxServersPerPage) {
                       serverCount -= maxServersPerPage;
                   }
                   success_scan_apperance();
                   unique_jobid = server_id_generation;
               }
           }
       }
       if (!player_found)
           await failed_scan_apperance();
   };

   async function searchServers() {
       startSearch();
       targetServerIds = [];
       serverIds.clear();
       friendServers.clear();
       allThumbnails.clear();
       foundAllServers = false;
       allPlayers = [];
       playersCount = 0;
       playersChecked = 0;
       maxPlayers = 0;
       var passes = 10;
       findTarget();
       for (var pass = 0; pass < passes; pass++)
           if (!foundAllServers) await fetchServers(pass + 1);
         
       foundAllServers = true;
   }
}

if (main_Servers_panel) {
   image_container.appendChild(private_server_btn);
   image_container.appendChild(imageLabel);
   main_Servers_panel.insertBefore(image_container, main_Servers_panel.firstChild);
   private_server_btn.addEventListener('click', function() {
       search_frame('Search For Player In-Game', '');
   });
}