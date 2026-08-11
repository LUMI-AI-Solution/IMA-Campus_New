with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

import re

# Remove the incorrectly placed tags at the end of the file
content = content.replace("}            </>\n", "}\n")
content = content.replace("        )}\n", "")

# Verify that the closing `</div>` is in the correct place for the main `<div className="p-6 ...">`
# Let's count divs if possible, but actually we just need to ensure the closing `</div>` for the main div exists.
# `</div>, document.body)}` is for the modal.
# The main component should end with:
#     </div>
#   );
# }
#
# Let's make sure that `    </div>\n  );\n}` exists!

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.write(content)
