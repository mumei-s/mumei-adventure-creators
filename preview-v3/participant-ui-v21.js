(() => {
  'use strict';

  function hideParticipantOnlyFields() {
    // オーナーの参加者編集モーダル：参加者ジョブとセリフパックは表示しない。
    document.querySelectorAll('#ownerCreatorEdit [name="job"], #ownerCreatorEdit [name="dialoguePack"]').forEach(el => {
      const label = el.closest('label');
      if (label) label.style.display = 'none';
      else el.style.display = 'none';
    });

    // 画像管理の参加クリエイター：ジョブ欄は内部値を保持したまま非表示。
    document.querySelectorAll('[data-v17-card][data-kind="creator"]').forEach(card => {
      const job = card.querySelector('[data-v17-job]');
      if (job) {
        const label = job.closest('label');
        if (label) label.style.display = 'none';
        else job.style.display = 'none';
      }
      const button = card.querySelector('[data-v17-save]');
      if (button && /ジョブ/.test(button.textContent || '')) button.textContent = '名前・画像を保存';
    });

    // 参加者向け公開フォームに旧ジョブUIが残っても表示しない。
    document.querySelectorAll('#joinForm [name="job"], #myForm [name="job"], #articleForm [name="job"], [data-participant-job]').forEach(el => {
      const label = el.closest('label');
      if (label) label.style.display = 'none';
      else el.style.display = 'none';
    });
  }

  const observer = new MutationObserver(hideParticipantOnlyFields);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  hideParticipantOnlyFields();
})();