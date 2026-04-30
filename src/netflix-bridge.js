(function () {
    window.addEventListener('message', function (event) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== '__SCENESKIP_NETFLIX_SEEK__') return;

        var targetMs = event.data.targetMs;
        try {
            var videoPlayer = window.netflix
                ?.appContext
                ?.state
                ?.playerApp
                ?.getAPI()
                ?.getVideoPlayer();

            var ids = videoPlayer?.getAllPlayerSessionIds?.() ?? [];
            if (ids.length === 0) throw new Error('no session');

            var player = videoPlayer.getVideoPlayerBySessionId(ids[0]);
            if (!player?.seek) throw new Error('no seek');

            player.seek(targetMs);
            window.postMessage({ type: '__SCENESKIP_NETFLIX_SEEK_OK__' }, '*');
        } catch (e) {
            window.postMessage({ type: '__SCENESKIP_NETFLIX_SEEK_FAIL__', reason: String(e) }, '*');
        }
    });
})();