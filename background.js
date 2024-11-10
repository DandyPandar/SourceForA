const func = (place, id) => {
    const serializedPlace = JSON.stringify(place);
    const serializedId = JSON.stringify(id);

    window.Roblox.GameLauncher.joinGameInstance(JSON.parse(serializedPlace), JSON.parse(serializedId));
};

chrome.runtime.onMessage.addListener(({
    message
}, {
    tab
}) => {
    if (typeof message.place === 'string' && typeof message.id === 'string') {
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id
            },
            func,
            args: [message.place, message.id],
            world: 'MAIN',
        });
    } else {
        console.error("message.place and message.id must be strings.");
    }
});
