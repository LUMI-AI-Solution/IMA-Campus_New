const fs = require('fs');
let content = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/PaymentScreen.jsx', 'utf-8');

const targetLogic = `    const isOverdue = statusText === 'Overdue';
    
    return (
      <TouchableOpacity 
        style={styles.paymentCard}
        onPress={() => {
            if (statusText === 'Due' || statusText === 'Overdue') {
                navigation.navigate('PaymentGroup', { batchId: item.batchId || null });
            }
        }}
        disabled={isHistory}
      >`;

const replaceLogic = `    const isOverdue = statusText === 'Overdue';
    const isUpcomingMonthly = item.isUpcomingMonthly === true;
    
    return (
      <TouchableOpacity 
        style={[styles.paymentCard, isUpcomingMonthly && { borderColor: COLORS.primary, borderWidth: 1 }]}
        onPress={() => {
            if (isUpcomingMonthly) {
                navigation.navigate('PaymentMethod', {
                    amount: item.amount,
                    businessId: item.businessId,
                    batchId: item.batchId,
                    groupId: item.groupId,
                    subjects: item.subjects,
                    payType: 'monthly',
                    isUpgrade: false
                });
            } else if (statusText === 'Due' || statusText === 'Overdue') {
                navigation.navigate('PaymentGroup', { batchId: item.batchId || null });
            }
        }}
        disabled={isHistory}
      >`;

if(content.includes('isUpcomingMonthly === true')) {
  console.log("Already updated PaymentScreen");
} else {
  content = content.replace(targetLogic, replaceLogic);
  
  // Also add a little badge for the Next Month tag inside the UI
  const badgeTarget = `            {statusText === 'Due' && (
              <View style={[styles.statusBadge, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.statusText, { color: '#1565C0' }]}>Pay Now</Text>
              </View>
            )}`;

  const badgeReplace = `            {isUpcomingMonthly ? (
              <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: COLORS.primary }]}>Pay Next Month</Text>
              </View>
            ) : statusText === 'Due' ? (
              <View style={[styles.statusBadge, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.statusText, { color: '#1565C0' }]}>Pay Now</Text>
              </View>
            ) : null}`;

  content = content.replace(badgeTarget, badgeReplace);
  
  fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/PaymentScreen.jsx', content);
  console.log("Updated PaymentScreen");
}
