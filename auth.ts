        await sendVerificationPin(
          user.email,
          user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || '',
          verificationPin,
          'italian'
        ); 

  }); 