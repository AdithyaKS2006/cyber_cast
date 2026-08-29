import apiClient from './apiClient';

export const callGemini = async (systemPrompt, userQuery, isJson = false) => {
  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const resData = await apiClient('/api/v1/guru/chat/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        prompt: userQuery,
        system_instruction: systemPrompt,
        is_json: isJson,
      }),
    });
    if (resData && (resData.success || resData.text)) {
      return resData.text;
    }
    throw new Error(resData?.error || resData?.text || 'Request failed');
  } catch (err) {
    throw err;
  }
};
