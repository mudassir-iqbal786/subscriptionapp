export const plansQueryKey = ['plans'];
export function planDetailQueryKey(planId) {
    return ['plan-detail', planId];
}

export async function fetchPlans() {
    const response = await window.axios.post('/api/getplans', {
        limit: 12,
    });

    return response.data.sellingPlanGroup ?? [];
}

export async function createPlan(payload) {
    const response = await window.axios.post('/api/create-plan', payload);

    return response.data;
}

export async function updatePlan(payload) {
    const response = await window.axios.post('/api/update-plan', payload);

    return response.data;
}

export async function deletePlan(planId) {
    const response = await window.axios.delete('/api/delete-plan', {
        data: {
            planId,
        },
    });

    return response.data;
}

export async function fetchPlanDetail(planId) {
    const response = await window.axios.get('/api/plan-detail', {
        params: {
            planId,
        },
    });

    return response.data.sellingPlanGroup ?? null;
}
