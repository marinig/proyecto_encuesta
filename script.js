document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('survey-form');
    const successState = document.getElementById('success-state');
    const submitBtn = document.getElementById('submit-btn');

    // Configuration
    const SUPABASE_FUNCTION_URL = 'https://flretcddfxpiczsvyfce.supabase.co/functions/v1/submit-survey';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable button and show loading state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Enviando...</span><div class="loader"></div>';

        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // Send to the secure Supabase Edge Function
            const response = await fetch(SUPABASE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en el servidor');
            }

            // Visual transition to success state
            form.style.opacity = '0';
            form.style.pointerEvents = 'none';
            
            setTimeout(() => {
                form.style.display = 'none';
                successState.style.display = 'block';
            }, 300);

        } catch (error) {
            console.error('Submission Error:', error);
            alert(`Error al enviar la encuesta: ${error.message}`);
            
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Add some micro-interactions for the inputs
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'translateX(5px)';
            input.parentElement.style.transition = 'transform 0.3s ease';
        });
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'translateX(0)';
        });
    });
});
