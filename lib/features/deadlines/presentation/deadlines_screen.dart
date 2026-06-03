import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';
import '../../auth/presentation/auth_notifier.dart';
import 'deadlines_provider.dart';

class DeadlinesScreen extends ConsumerStatefulWidget {
  const DeadlinesScreen({super.key});

  @override
  ConsumerState<DeadlinesScreen> createState() => _DeadlinesScreenState();
}

class _DeadlinesScreenState extends ConsumerState<DeadlinesScreen> {
  String _searchQuery = '';
  String _selectedPriority = 'ALL';
  String _selectedDepartmentId = 'ALL';
  bool _showCompleted = false;

  @override
  Widget build(BuildContext context) {
    final deadlinesState = ref.watch(deadlinesProvider);
    final departmentsState = ref.watch(departmentsProvider);
    final authState = ref.watch(authNotifierProvider);
    final currentUser = authState.user;
    
    // Faculty are restricted to their own department in listDeadlines on backend,
    // but we can also filter client-side just in case.
    final isFaculty = currentUser?.role == 'FACULTY';
    final userDeptId = currentUser?.departmentId;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Academic Deadlines',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Filter Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Column(
              children: [
                // Search Field
                TextField(
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search deadlines...',
                    prefixIcon: const Icon(Icons.search, color: AppTheme.primary),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                
                // Filters Row
                Row(
                  children: [
                    // Priority Filter
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedPriority,
                            isExpanded: true,
                            items: const [
                              DropdownMenuItem(value: 'ALL', child: Text('All Priorities')),
                              DropdownMenuItem(value: 'HIGH', child: Text('High')),
                              DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                              DropdownMenuItem(value: 'LOW', child: Text('Low')),
                            ],
                            onChanged: (val) {
                              setState(() {
                                _selectedPriority = val ?? 'ALL';
                              });
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    
                    // Department Filter (only active/visible if user is not Faculty)
                    if (!isFaculty)
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: departmentsState.maybeWhen(
                              data: (depts) {
                                return DropdownButton<String>(
                                  value: _selectedDepartmentId,
                                  isExpanded: true,
                                  items: [
                                    const DropdownMenuItem(value: 'ALL', child: Text('All Depts')),
                                    ...depts.map((d) => DropdownMenuItem(value: d.id, child: Text(d.code))),
                                  ],
                                  onChanged: (val) {
                                    setState(() {
                                      _selectedDepartmentId = val ?? 'ALL';
                                    });
                                  },
                                );
                              },
                              orElse: () => const Center(
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ),
                          ),
                        ),
                      )
                    else
                      const SizedBox.shrink(),
                  ],
                ),
                
                // Show completed Switch
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Show Completed Deadlines',
                      style: TextStyle(fontSize: 14, color: AppTheme.darkBlue, fontWeight: FontWeight.w500),
                    ),
                    Switch(
                      value: _showCompleted,
                      activeThumbColor: AppTheme.primary,
                      onChanged: (val) {
                        setState(() {
                          _showCompleted = val;
                        });
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Deadlines List
          Expanded(
            child: deadlinesState.when(
              data: (deadlines) {
                // Apply filters
                var filtered = deadlines.where((d) {
                  // Search query
                  final matchesSearch = d.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                      d.description.toLowerCase().contains(_searchQuery.toLowerCase());
                  
                  // Priority
                  final matchesPriority = _selectedPriority == 'ALL' || d.priority == _selectedPriority;
                  
                  // Department
                  final matchesDept = isFaculty
                      ? (d.departmentId == userDeptId)
                      : (_selectedDepartmentId == 'ALL' || d.departmentId == _selectedDepartmentId);
                      
                  // Completion
                  final matchesCompleted = _showCompleted ? true : !d.isCompleted;

                  return matchesSearch && matchesPriority && matchesDept && matchesCompleted;
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          'No deadlines found',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 16, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(deadlinesProvider.notifier).fetchDeadlines(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final deadline = filtered[idx];
                      return _buildDeadlineCard(context, deadline, currentUser?.id == deadline.createdById || !isFaculty);
                    },
                  ),
                );
              },
              error: (err, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load deadlines: $err',
                      style: const TextStyle(color: AppTheme.error),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => ref.read(deadlinesProvider.notifier).fetchDeadlines(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showDeadlineModal(context, null),
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildDeadlineCard(BuildContext context, Deadline deadline, bool canManage) {
    Color priorityColor;
    Color priorityBg;
    
    switch (deadline.priority) {
      case 'HIGH':
        priorityColor = Colors.red.shade700;
        priorityBg = Colors.red.shade50;
        break;
      case 'MEDIUM':
        priorityColor = Colors.amber.shade800;
        priorityBg = Colors.amber.shade50;
        break;
      default:
        priorityColor = Colors.green.shade700;
        priorityBg = Colors.green.shade50;
    }

    final dateString = DateFormat('MMM dd, yyyy - hh:mm a').format(deadline.dueDate.toLocal());
    final isOverdue = deadline.dueDate.isBefore(DateTime.now()) && !deadline.isCompleted;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Priority Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: priorityBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    deadline.priority,
                    style: TextStyle(
                      color: priorityColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                
                // Due Date text
                Row(
                  children: [
                    if (isOverdue)
                      const Padding(
                        padding: EdgeInsets.only(right: 6),
                        child: Icon(Icons.warning_amber_rounded, size: 16, color: AppTheme.error),
                      ),
                    Text(
                      dateString,
                      style: TextStyle(
                        color: isOverdue ? AppTheme.error : Colors.black54,
                        fontSize: 12,
                        fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Title and Description
            Text(
              deadline.title,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppTheme.darkBlue,
                decoration: deadline.isCompleted ? TextDecoration.lineThrough : null,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              deadline.description,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            
            // Info Row: Department, CreatedBy, Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (deadline.departmentName != null)
                      Text(
                        'Dept: ${deadline.departmentName}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                      ),
                    if (deadline.createdByFullName != null)
                      Text(
                        'By: ${deadline.createdByFullName}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                  ],
                ),
                
                // Actions Button or Completion Toggle
                Row(
                  children: [
                    // Completed status checkbox
                    Checkbox(
                      value: deadline.isCompleted,
                      activeColor: Colors.green,
                      onChanged: (val) {
                        if (val != null) {
                          ref.read(deadlinesProvider.notifier).updateDeadline(
                            deadline.id,
                            {'isCompleted': val},
                          );
                        }
                      },
                    ),
                    if (canManage)
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, color: AppTheme.primary, size: 20),
                        onPressed: () => _showDeadlineModal(context, deadline),
                      ),
                    if (canManage)
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppTheme.error, size: 20),
                        onPressed: () => _showDeleteConfirm(context, deadline.id),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteConfirm(BuildContext context, String deadlineId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Deadline'),
        content: const Text('Are you sure you want to permanently delete this deadline?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            onPressed: () {
              ref.read(deadlinesProvider.notifier).deleteDeadline(deadlineId);
              Navigator.pop(ctx);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showDeadlineModal(BuildContext context, Deadline? existing) {
    final formKey = GlobalKey<FormState>();
    final titleController = TextEditingController(text: existing?.title ?? '');
    final descController = TextEditingController(text: existing?.description ?? '');
    DateTime selectedDate = existing?.dueDate ?? DateTime.now().add(const Duration(days: 1));
    String priority = existing?.priority ?? 'HIGH';
    bool addToGoogleCalendar = false;
    
    final authState = ref.read(authNotifierProvider);
    final isFaculty = authState.user?.role == 'FACULTY';
    final userDeptId = authState.user?.departmentId;
    
    String departmentId = existing?.departmentId ?? 
                          (isFaculty ? (userDeptId ?? '') : 'ALL');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final deptsAsync = ref.watch(departmentsProvider);
            
            // If departments list loaded and we need to choose one
            if (departmentId == 'ALL' && deptsAsync.value != null && deptsAsync.value!.isNotEmpty) {
              departmentId = deptsAsync.value!.first.id;
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        existing == null ? 'Create New Deadline' : 'Edit Deadline',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.darkBlue,
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Title
                      TextFormField(
                        controller: titleController,
                        decoration: const InputDecoration(labelText: 'Title'),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Please enter a title' : null,
                      ),
                      const SizedBox(height: 12),
                      
                      // Description
                      TextFormField(
                        controller: descController,
                        maxLines: 3,
                        decoration: const InputDecoration(labelText: 'Description'),
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Please enter description' : null,
                      ),
                      const SizedBox(height: 12),
                      
                      // Priority Dropdown
                      DropdownButtonFormField<String>(
                        initialValue: priority,
                        decoration: const InputDecoration(labelText: 'Priority'),
                        items: const [
                          DropdownMenuItem(value: 'HIGH', child: Text('High Priority')),
                          DropdownMenuItem(value: 'MEDIUM', child: Text('Medium Priority')),
                          DropdownMenuItem(value: 'LOW', child: Text('Low Priority')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              priority = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      
                      // Department Dropdown (only enabled/visible for ADMIN/HOD. Faculty must submit to their own department)
                      if (!isFaculty)
                        deptsAsync.when(
                          data: (depts) {
                            return DropdownButtonFormField<String>(
                              initialValue: depts.any((d) => d.id == departmentId) ? departmentId : depts.first.id,
                              decoration: const InputDecoration(labelText: 'Target Department'),
                              items: depts.map((d) {
                                return DropdownMenuItem(
                                  value: d.id,
                                  child: Text('${d.name} (${d.code})'),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setModalState(() {
                                    departmentId = val;
                                  });
                                }
                              },
                            );
                          },
                          loading: () => const Center(child: CircularProgressIndicator()),
                          error: (e, s) => Text('Error loading departments: $e'),
                        )
                      else ...[
                        // For Faculty, show read-only department code if available
                        const SizedBox(height: 8),
                        Text(
                          'Target Department: Assigned automatically to your department.',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                      const SizedBox(height: 16),
                      
                      // Due Date Picker
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Due Date & Time', style: TextStyle(color: Colors.black54, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                DateFormat('EEE, MMM dd, yyyy - hh:mm a').format(selectedDate.toLocal()),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.darkBlue),
                              ),
                            ],
                          ),
                          OutlinedButton(
                            onPressed: () async {
                              final pickedDate = await showDatePicker(
                                context: context,
                                initialDate: selectedDate,
                                firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                lastDate: DateTime.now().add(const Duration(days: 365)),
                              );
                              if (pickedDate != null) {
                                if (!context.mounted) return;
                                final pickedTime = await showTimePicker(
                                  context: context,
                                  initialTime: TimeOfDay.fromDateTime(selectedDate),
                                );
                                if (pickedTime != null) {
                                  setModalState(() {
                                    selectedDate = DateTime(
                                      pickedDate.year,
                                      pickedDate.month,
                                      pickedDate.day,
                                      pickedTime.hour,
                                      pickedTime.minute,
                                    );
                                  });
                                }
                              }
                            },
                            child: const Text('Change'),
                          ),
                        ],
                      ),
                      
                      // Google Calendar sync toggle
                      if (existing == null) ...[
                        const SizedBox(height: 12),
                        SwitchListTile(
                          title: const Text('Add to Google Calendar', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                          subtitle: const Text('Sync this deadline to your Google Calendar', style: TextStyle(fontSize: 12)),
                          contentPadding: EdgeInsets.zero,
                          value: addToGoogleCalendar,
                          activeThumbColor: AppTheme.primary,
                          onChanged: (val) {
                            setModalState(() {
                              addToGoogleCalendar = val;
                            });
                          },
                        ),
                      ],
                      const SizedBox(height: 24),
                      
                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            if (formKey.currentState?.validate() ?? false) {
                              if (isFaculty && (userDeptId == null || userDeptId.isEmpty)) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Error: Faculty profile lacks department configuration.')),
                                );
                                return;
                              }
                              
                              final finalDeptId = isFaculty ? userDeptId! : departmentId;
                              
                              try {
                                if (existing == null) {
                                  await ref.read(deadlinesProvider.notifier).createDeadline(
                                    title: titleController.text.trim(),
                                    description: descController.text.trim(),
                                    dueDate: selectedDate,
                                    priority: priority,
                                    departmentId: finalDeptId,
                                    addToGoogleCalendar: addToGoogleCalendar,
                                  );
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Deadline created successfully!'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } else {
                                  await ref.read(deadlinesProvider.notifier).updateDeadline(
                                    existing.id,
                                    {
                                      'title': titleController.text.trim(),
                                      'description': descController.text.trim(),
                                      'dueDate': selectedDate.toIso8601String(),
                                      'priority': priority,
                                      'departmentId': finalDeptId,
                                    },
                                  );
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Deadline updated successfully!'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                }
                                if (ctx.mounted) {
                                  Navigator.pop(ctx);
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  String readableError = e.toString();
                                  if (e is DioException) {
                                    final data = e.response?.data;
                                    if (data is Map<String, dynamic>) {
                                      final errorMsg = data['error'];
                                      final details = data['details'];
                                      if (details is List && details.isNotEmpty) {
                                        readableError = '$errorMsg: ${details.join(', ')}';
                                      } else if (errorMsg != null) {
                                        readableError = errorMsg.toString();
                                      }
                                    } else {
                                      readableError = e.message ?? 'Network connection error';
                                    }
                                  }
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Operation failed: $readableError'),
                                      backgroundColor: AppTheme.error,
                                      behavior: SnackBarBehavior.floating,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  );
                                }
                              }
                            }
                          },
                          child: Text(
                            existing == null ? 'Create Deadline' : 'Save Changes',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
