import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

const deliveries = ref([])

export function useDeliveries() {
  let channel = null

  const fetchDeliveries = async () => {
    // Filter to last 3 months to avoid 1000 row limit
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const startDate = threeMonthsAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        quantity,
        delivery_date,
        status,
        price_snapshot,
        workers (id, name),
        products (id, name, category, unit, price_per_unit)
      `)
      .gte('delivery_date', startDate)
      .order('delivery_date', { ascending: false })

    if (!error) deliveries.value = data
    else console.error('fetchDeliveries error:', error)
  }

  const subscribeToRealtime = () => {
    if (channel) return

    channel = supabase
      .channel('public:deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        payload => {
          console.log('Realtime update:', payload)
          fetchDeliveries()
        }
      )
      .subscribe()
  }

  onMounted(() => {
    fetchDeliveries()
    subscribeToRealtime()
  })

  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return {
    deliveries,
    fetchDeliveries
  }
}
